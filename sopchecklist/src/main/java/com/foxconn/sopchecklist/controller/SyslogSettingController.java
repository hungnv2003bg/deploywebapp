package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.SyslogSetting;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.service.SyslogSettingService;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/syslog-settings")
@CrossOrigin
public class SyslogSettingController {

    private final SyslogSettingService service;
    private final UsersService usersService;

    public SyslogSettingController(SyslogSettingService service, UsersService usersService) {
        this.service = service;
        this.usersService = usersService;
    }

    @GetMapping("/visible-severities")
    public List<String> getVisibleSeverities() {
        return service.getVisibleSeverities();
    }

    @PostMapping("/visible-severities")
    public ResponseEntity<?> updateVisibleSeverities(@RequestBody Map<String, Object> body) {
        Users me = usersService.getCurrentAuthenticatedUser();
        if (me == null || me.getRoles() == null ||
                me.getRoles().stream().noneMatch(r -> "ADMIN".equalsIgnoreCase(r.getName()))) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        Object severitiesObj = body.get("severities");
        List<String> severities = null;
        if (severitiesObj instanceof List<?>) {
            severities = ((List<?>) severitiesObj).stream()
                    .map(Object::toString)
                    .collect(Collectors.toList());
        }

        SyslogSetting saved = service.saveVisibleSeverities(severities, me.getUserID() != null ? me.getUserID().longValue() : null);
        Map<String, Object> result = new HashMap<>();
        result.put("id", saved.getId());
        result.put("severities", service.getVisibleSeverities());
        result.put("updatedBy", saved.getUpdatedBy());
        result.put("updatedAt", saved.getUpdatedAt());
        return ResponseEntity.ok(result);
    }
}

