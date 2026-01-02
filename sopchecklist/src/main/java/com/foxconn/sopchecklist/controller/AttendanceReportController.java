package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.AttendanceReport;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.AttendanceReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import com.foxconn.sopchecklist.config.UserPrincipal;

import java.net.URI;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin
public class AttendanceReportController {

    private final AttendanceReportService service;
    private final UsersRepository usersRepository;

    public AttendanceReportController(AttendanceReportService service, UsersRepository usersRepository) {
        this.service = service;
        this.usersRepository = usersRepository;
    }

    @GetMapping
    public List<AttendanceReport> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AttendanceReport> findById(@PathVariable Long id) {
        AttendanceReport attendanceReport = service.findById(id);
        if (attendanceReport == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(attendanceReport);
    }

    @GetMapping("/date/{date}")
    public List<AttendanceReport> findByDate(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.findByDate(date);
    }

    @GetMapping("/user/{userId}")
    public List<AttendanceReport> findByUserId(@PathVariable Integer userId) {
        return service.findByUserId(userId);
    }

    @GetMapping("/user/{userId}/date/{date}")
    public ResponseEntity<AttendanceReport> findByUserIdAndDate(
            @PathVariable Integer userId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Optional<AttendanceReport> attendanceReport = service.findByUserIdAndDate(userId, date);
        if (attendanceReport.isPresent()) {
            return ResponseEntity.ok(attendanceReport.get());
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/range")
    public List<AttendanceReport> findByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return service.findByDateRange(startDate, endDate);
    }

    @GetMapping("/user/{userId}/range")
    public List<AttendanceReport> findByUserIdAndDateRange(
            @PathVariable Integer userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return service.findByUserIdAndDateRange(userId, startDate, endDate);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "UNAUTHORIZED");
                err.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(err);
            }
            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            boolean isAdmin = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch(role -> "ROLE_ADMIN".equals(role));
            Integer userId = Integer.valueOf(body.get("userId").toString());
            LocalDate attendanceDate = LocalDate.parse(body.get("attendanceDate").toString());
            String status = body.get("status").toString();
            
            LocalTime clockInTime = null;
            if (body.get("clockInTime") != null && !body.get("clockInTime").toString().isEmpty()) {
                clockInTime = LocalTime.parse(body.get("clockInTime").toString());
            }
            
            LocalTime clockOutTime = null;
            if (body.get("clockOutTime") != null && !body.get("clockOutTime").toString().isEmpty()) {
                clockOutTime = LocalTime.parse(body.get("clockOutTime").toString());
            }
            
            String note = body.get("note") != null ? body.get("note").toString() : null;
            String shift = body.get("shift") != null ? body.get("shift").toString() : null;
            Double overtimeHours = null;
            if (body.get("overtimeHours") != null) {
                try {
                    overtimeHours = Double.parseDouble(body.get("overtimeHours").toString());
                } catch (NumberFormatException ignored) {
                }
            }
            Double plannedOvertimeHours = null;
            if (body.get("plannedOvertimeHours") != null) {
                try {
                    plannedOvertimeHours = Double.parseDouble(body.get("plannedOvertimeHours").toString());
                } catch (NumberFormatException ignored) {
                }
            }
            if (!isAdmin && (principal.getUserId() == null || !principal.getUserId().equals(userId))) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "FORBIDDEN");
                err.put("message", "Not allowed to create attendance for other users");
                return ResponseEntity.status(403).body(err);
            }

            AttendanceReport created = service.createOrUpdate(userId, attendanceDate, status, clockInTime, clockOutTime, note, shift);
            if (overtimeHours != null || plannedOvertimeHours != null) {
                if (overtimeHours != null) {
                    created.setOvertimeHours(overtimeHours);
                }
                if (plannedOvertimeHours != null) {
                    created.setPlannedOvertimeHours(plannedOvertimeHours);
                }
                created = service.update(created.getId(), created);
            }
            return ResponseEntity.created(URI.create("/api/attendance/" + created.getId())).body(created);
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "VALIDATION");
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Users user = usersRepository.findById(Integer.valueOf(body.get("userId").toString()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user"));
            
            LocalDate attendanceDate = LocalDate.parse(body.get("attendanceDate").toString());
            String status = body.get("status").toString();
            
            LocalTime clockInTime = null;
            if (body.get("clockInTime") != null && !body.get("clockInTime").toString().isEmpty()) {
                clockInTime = LocalTime.parse(body.get("clockInTime").toString());
            }
            
            LocalTime clockOutTime = null;
            if (body.get("clockOutTime") != null && !body.get("clockOutTime").toString().isEmpty()) {
                clockOutTime = LocalTime.parse(body.get("clockOutTime").toString());
            }
            
            String note = body.get("note") != null ? body.get("note").toString() : null;
            String shift = body.get("shift") != null ? body.get("shift").toString() : null;
            Double overtimeHours = null;
            if (body.get("overtimeHours") != null) {
                try {
                    overtimeHours = Double.parseDouble(body.get("overtimeHours").toString());
                } catch (NumberFormatException ignored) {
                }
            }
            Double plannedOvertimeHours = null;
            if (body.get("plannedOvertimeHours") != null) {
                try {
                    plannedOvertimeHours = Double.parseDouble(body.get("plannedOvertimeHours").toString());
                } catch (NumberFormatException ignored) {
                }
            }

            AttendanceReport attendanceReport = new AttendanceReport();
            attendanceReport.setUser(user);
            attendanceReport.setAttendanceDate(attendanceDate);
            attendanceReport.setStatus(status);
            attendanceReport.setClockInTime(clockInTime);
            attendanceReport.setClockOutTime(clockOutTime);
            attendanceReport.setNote(note);
            attendanceReport.setShift(shift);
            attendanceReport.setOvertimeHours(overtimeHours);
            attendanceReport.setPlannedOvertimeHours(plannedOvertimeHours);

            AttendanceReport updated = service.update(id, attendanceReport);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "VALIDATION");
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @PutMapping("/{id}/overtime")
    public ResponseEntity<?> updateOvertimeHours(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "UNAUTHORIZED");
                err.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(err);
            }
            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            boolean isAdmin = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch(role -> "ROLE_ADMIN".equals(role));
            Double overtimeHours = null;
            if (body.get("overtimeHours") != null) {
                try {
                    overtimeHours = Double.parseDouble(body.get("overtimeHours").toString());
                } catch (NumberFormatException e) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("error", "VALIDATION");
                    err.put("message", "Invalid overtimeHours format");
                    return ResponseEntity.badRequest().body(err);
                }
            }
            
            AttendanceReport existing = service.findById(id);
            if (existing == null) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "NOT_FOUND");
                err.put("message", "Attendance report not found");
                return ResponseEntity.notFound().build();
            }
            Integer ownerId = existing.getUser() != null ? existing.getUser().getUserID() : null;
            if (!isAdmin && (ownerId == null || !ownerId.equals(principal.getUserId()))) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "FORBIDDEN");
                err.put("message", "Not allowed to edit overtime of other users");
                return ResponseEntity.status(403).body(err);
            }
            
            existing.setOvertimeHours(overtimeHours);
            existing.setUpdatedAt(LocalDateTime.now());
            AttendanceReport updated = service.update(id, existing);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @PutMapping("/{id}/planned-overtime")
    public ResponseEntity<?> updatePlannedOvertimeHours(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "UNAUTHORIZED");
                err.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(err);
            }
            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            boolean isAdmin = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch(role -> "ROLE_ADMIN".equals(role));
            Double plannedOvertimeHours = null;
            if (body.get("plannedOvertimeHours") != null) {
                try {
                    plannedOvertimeHours = Double.parseDouble(body.get("plannedOvertimeHours").toString());
                } catch (NumberFormatException e) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("error", "VALIDATION");
                    err.put("message", "Invalid plannedOvertimeHours format");
                    return ResponseEntity.badRequest().body(err);
                }
            }

            AttendanceReport existing = service.findById(id);
            if (existing == null) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "NOT_FOUND");
                err.put("message", "Attendance report not found");
                return ResponseEntity.notFound().build();
            }
            Integer ownerId = existing.getUser() != null ? existing.getUser().getUserID() : null;
            if (!isAdmin && (ownerId == null || !ownerId.equals(principal.getUserId()))) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "FORBIDDEN");
                err.put("message", "Not allowed to edit planned overtime of other users");
                return ResponseEntity.status(403).body(err);
            }

            existing.setPlannedOvertimeHours(plannedOvertimeHours);
            existing.setUpdatedAt(LocalDateTime.now());
            AttendanceReport updated = service.update(id, existing);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/create-next-7-days")
    public ResponseEntity<?> createAttendanceForNext7Days(@RequestBody Map<String, Object> body) {
        try {
            Integer userId = Integer.valueOf(body.get("userId").toString());
            String shift = body.get("shift") != null ? body.get("shift").toString() : "Ngày";
            List<AttendanceReport> createdReports = service.createAttendanceForNext7Days(userId, shift);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đã tạo thành công " + createdReports.size() + " bản ghi điểm danh");
            response.put("count", createdReports.size());
            response.put("reports", createdReports);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "VALIDATION");
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }
}

