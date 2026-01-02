package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.UserAttendance;
import com.foxconn.sopchecklist.dto.UserAttendanceSimpleDTO;
import com.foxconn.sopchecklist.service.UserAttendanceService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user-attendance")
@CrossOrigin
public class UserAttendanceController {

    private final UserAttendanceService service;

    public UserAttendanceController(UserAttendanceService service) {
        this.service = service;
    }

    @GetMapping
    public List<UserAttendance> findAll() {
        return service.findAll();
    }

    @GetMapping("/active")
    public List<UserAttendance> findActive() {
        return service.findActiveUsers();
    }

    @GetMapping("/active/page")
    public ResponseEntity<Map<String, Object>> findActivePaged(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "groupId", required = false) Long groupId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        Page<UserAttendance> result = service.findActiveWithFilters(search, groupId, page, size);
        java.util.List<UserAttendanceSimpleDTO> content = result.getContent().stream().map(ua -> {
            Integer userId = ua.getUser() != null ? ua.getUser().getUserID() : null;
            return new UserAttendanceSimpleDTO(
                    ua.getId(),
                    userId,
                    ua.getIsActive(),
                    ua.getShift()
            );
        }).toList();
        Map<String, Object> body = new HashMap<>();
        body.put("content", content);
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserAttendance> findById(@PathVariable Long id) {
        UserAttendance userAttendance = service.findById(id);
        if (userAttendance == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(userAttendance);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<UserAttendance> findByUserId(@PathVariable Integer userId) {
        return service.findByUserId(userId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            Integer userId = Integer.valueOf(body.get("userId").toString());
            String shift = body.get("shift") != null ? body.get("shift").toString() : "Ngày";
            UserAttendance created = service.create(userId, shift);
            return ResponseEntity.created(URI.create("/api/user-attendance/" + created.getId())).body(created);
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
            Boolean isActive = body.get("isActive") != null ? Boolean.valueOf(body.get("isActive").toString()) : null;
            String shift = body.get("shift") != null ? body.get("shift").toString() : null;

            UserAttendance updated = service.update(id, isActive, shift);
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/user/{userId}")
    public ResponseEntity<Void> deleteByUserId(@PathVariable Integer userId) {
        service.deleteByUserId(userId);
        return ResponseEntity.noContent().build();
    }
}

