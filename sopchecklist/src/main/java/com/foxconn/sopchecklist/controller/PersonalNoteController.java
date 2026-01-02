package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.PersonalNote;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.service.PersonalNoteService;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/personal-notes")
@CrossOrigin
public class PersonalNoteController {

    private final PersonalNoteService service;
    private final UsersService usersService;

    public PersonalNoteController(PersonalNoteService service, UsersService usersService) {
        this.service = service;
        this.usersService = usersService;
    }

    /**
     * Lấy tất cả ghi chú của user hiện tại đang đăng nhập
     */
    @GetMapping
    public ResponseEntity<?> findAll() {
        Users currentUser = usersService.getCurrentAuthenticatedUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        List<PersonalNote> notes = service.findByUserId(currentUser.getUserID());
        return ResponseEntity.ok(notes);
    }

    /**
     * Lấy ghi chú của user hiện tại trong khoảng thời gian
     */
    @GetMapping("/range")
    public ResponseEntity<?> findByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Users currentUser = usersService.getCurrentAuthenticatedUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        List<PersonalNote> notes = service.findByUserIdAndDateRange(
            currentUser.getUserID(), startDate, endDate);
        return ResponseEntity.ok(notes);
    }

    /**
     * Lấy ghi chú của user hiện tại theo ngày
     */
    @GetMapping("/date/{date}")
    public ResponseEntity<?> findByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Users currentUser = usersService.getCurrentAuthenticatedUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        Optional<PersonalNote> note = service.findByUserIdAndDate(currentUser.getUserID(), date);
        return note.map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok().build());
    }

    /**
     * Lấy tất cả ghi chú của user từ ngày hiện tại trở đi (tương lai)
     * Phải đặt trước /{id} để tránh conflict routing
     */
    @GetMapping("/future")
    public ResponseEntity<?> getFutureNotes() {
        Users currentUser = usersService.getCurrentAuthenticatedUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        try {
            List<PersonalNote> notes = service.findFutureNotesByUserId(currentUser.getUserID());
            return ResponseEntity.ok(notes);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    /**
     * Lấy ghi chú theo ID (chỉ nếu là của user hiện tại)
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> findById(@PathVariable Long id) {
        Users currentUser = usersService.getCurrentAuthenticatedUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        PersonalNote note = service.findById(id);
        if (note == null) {
            return ResponseEntity.notFound().build();
        }

        // Kiểm tra xem note có phải của user hiện tại không
        if (!note.getUser().getUserID().equals(currentUser.getUserID())) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        return ResponseEntity.ok(note);
    }

    /**
     * Tạo hoặc cập nhật ghi chú
     */
    @PostMapping
    public ResponseEntity<?> saveOrUpdate(@RequestBody Map<String, Object> body) {
        Users currentUser = usersService.getCurrentAuthenticatedUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        try {
            // Validate và parse date
            Object noteDateObj = body.get("noteDate");
            if (noteDateObj == null) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "VALIDATION");
                err.put("message", "noteDate is required");
                return ResponseEntity.badRequest().body(err);
            }
            
            LocalDate noteDate;
            try {
                noteDate = LocalDate.parse(noteDateObj.toString());
            } catch (Exception e) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "VALIDATION");
                err.put("message", "Invalid date format: " + e.getMessage());
                return ResponseEntity.badRequest().body(err);
            }
            
            String content = body.get("content") != null ? body.get("content").toString() : "";
            Boolean publicVisible = null;
            if (body.containsKey("publicVisible")) {
                Object pv = body.get("publicVisible");
                if (pv != null) {
                    publicVisible = Boolean.valueOf(String.valueOf(pv));
                }
            }

            PersonalNote saved = service.saveOrUpdate(
                currentUser.getUserID(), noteDate, content, publicVisible);
            // Nếu saved là null (đã xóa note hoặc không tạo mới), trả về success
            if (saved == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Operation completed");
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            e.printStackTrace(); // Log để debug
            Map<String, Object> err = new HashMap<>();
            err.put("error", "VALIDATION");
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            e.printStackTrace(); // Log để debug
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @GetMapping("/public/date/{date}")
    public ResponseEntity<?> findPublicByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<PersonalNote> notes = service.findPublicNotesByDate(date);
        return ResponseEntity.ok(notes);
    }

    @GetMapping("/public/range")
    public ResponseEntity<?> findPublicByRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<PersonalNote> notes = service.findPublicNotesByDateRange(startDate, endDate);
        return ResponseEntity.ok(notes);
    }

    /**
     * Xóa ghi chú theo ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Users currentUser = usersService.getCurrentAuthenticatedUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        PersonalNote note = service.findById(id);
        if (note == null) {
            return ResponseEntity.notFound().build();
        }

        // Kiểm tra xem note có phải của user hiện tại không
        if (!note.getUser().getUserID().equals(currentUser.getUserID())) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        try {
            service.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Xóa ghi chú theo ngày
     */
    @DeleteMapping("/date/{date}")
    public ResponseEntity<?> deleteByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Users currentUser = usersService.getCurrentAuthenticatedUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        try {
            service.deleteByUserIdAndDate(currentUser.getUserID(), date);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    /**
     * Lấy số lượng ghi chú theo từng tháng trong năm
     */
    @GetMapping("/year/{year}/month-counts")
    public ResponseEntity<?> getMonthCountsForYear(@PathVariable Integer year) {
        Users currentUser = usersService.getCurrentAuthenticatedUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        try {
            Map<Integer, Long> monthCounts = service.getNotesCountByMonthForYear(
                currentUser.getUserID(), year);
            return ResponseEntity.ok(monthCounts);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

}

