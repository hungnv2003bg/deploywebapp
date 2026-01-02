package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.dto.OvertimeMonthSummaryDTO;
import com.foxconn.sopchecklist.entity.OvertimeConfig;
import com.foxconn.sopchecklist.service.OvertimeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.foxconn.sopchecklist.config.UserPrincipal;

@RestController
@RequestMapping("/api/overtime")
@CrossOrigin
public class OvertimeController {

    private final OvertimeService overtimeService;

    public OvertimeController(OvertimeService overtimeService) {
        this.overtimeService = overtimeService;
    }

    @GetMapping("/month-summary")
    public ResponseEntity<OvertimeMonthSummaryDTO> getMonthSummary(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) String userIds
    ) {
        List<Integer> parsedUserIds = parseUserIds(userIds);
        OvertimeMonthSummaryDTO summary = overtimeService.getMonthSummary(year, month, parsedUserIds);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/month-user-targets")
    public ResponseEntity<List<Map<String, Object>>> getMonthUserTargets(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) String userIds
    ) {
        List<Integer> parsedUserIds = parseUserIds(userIds);
        List<Map<String, Object>> results = overtimeService.getTargetsForUsers(year, month, parsedUserIds);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/month-target")
    public ResponseEntity<?> saveMonthTarget(@RequestBody Map<String, Object> body) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "UNAUTHORIZED");
                err.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(err);
            }
            boolean isAdmin = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch(role -> "ROLE_ADMIN".equals(role));
            if (!isAdmin) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "FORBIDDEN");
                err.put("message", "Only admin can set global overtime target");
                return ResponseEntity.status(403).body(err);
            }
            if (!body.containsKey("year") || !body.containsKey("month") || !body.containsKey("targetHours")) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "VALIDATION");
                err.put("message", "Missing required fields: year, month, targetHours");
                return ResponseEntity.badRequest().body(err);
            }
            int year = Integer.parseInt(body.get("year").toString());
            int month = Integer.parseInt(body.get("month").toString());
            double targetHours = Double.parseDouble(body.get("targetHours").toString());
            OvertimeConfig saved = overtimeService.saveOrUpdateTargetHours(year, month, targetHours);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @PostMapping("/month-user-target")
    public ResponseEntity<?> saveMonthUserTarget(@RequestBody Map<String, Object> body) {
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
            if (!body.containsKey("year") || !body.containsKey("month") || !body.containsKey("userId") || !body.containsKey("targetHours")) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "VALIDATION");
                err.put("message", "Missing required fields: year, month, userId, targetHours");
                return ResponseEntity.badRequest().body(err);
            }
            int year = Integer.parseInt(body.get("year").toString());
            int month = Integer.parseInt(body.get("month").toString());
            int userId = Integer.parseInt(body.get("userId").toString());
            double targetHours = Double.parseDouble(body.get("targetHours").toString());
            if (!isAdmin && (principal.getUserId() == null || !principal.getUserId().equals(userId))) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "FORBIDDEN");
                err.put("message", "Not allowed to edit overtime target for other users");
                return ResponseEntity.status(403).body(err);
            }
            Integer editor = null;
            if (body.get("lastEditBy") != null) {
                try {
                    editor = Integer.parseInt(body.get("lastEditBy").toString());
                } catch (NumberFormatException ignored) {}
            }
            OvertimeConfig saved = overtimeService.saveOrUpdateTargetHoursForUser(year, month, userId, targetHours, editor);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "SERVER_ERROR");
            err.put("message", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    private List<Integer> parseUserIds(String userIds) {
        List<Integer> result = new ArrayList<>();
        if (userIds == null || userIds.trim().isEmpty()) {
            return result;
        }
        String[] parts = userIds.split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                try {
                    result.add(Integer.parseInt(trimmed));
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return result;
    }
}
