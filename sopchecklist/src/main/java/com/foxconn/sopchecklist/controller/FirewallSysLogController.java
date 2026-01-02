package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.dto.FirewallSysLogKeysetResponse;
import com.foxconn.sopchecklist.entity.FirewallSysLog;
import com.foxconn.sopchecklist.service.FirewallSysLogService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Controller cho Firewall Syslog
 * Endpoints: /api/firewall/syslogs
 */
@RestController
@RequestMapping("/api/firewall")
@CrossOrigin
public class FirewallSysLogController {

    private final FirewallSysLogService service;

    public FirewallSysLogController(FirewallSysLogService service) {
        this.service = service;
    }

    /**
     * Get firewall syslogs với pagination
     * 
     * @param severity Filter by severity (optional)
     * @param hostname Filter by hostname (optional)
     * @param logText Search in log text (optional)
     * @param fromDate Start date filter (optional)
     * @param toDate End date filter (optional)
     * @param from Alternative start date (LocalDate) (optional)
     * @param to Alternative end date (LocalDate) (optional)
     * @param page Page number (default: 0)
     * @param size Page size (default: 20, max: 200)
     * @return Page of FirewallSysLog
     */
    @GetMapping("/syslogs")
    public Page<FirewallSysLog> getAllLogs(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String hostname,
            @RequestParam(required = false) String logText,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        LocalDateTime f = from != null ? from.atStartOfDay() : fromDate;
        LocalDateTime t = to != null ? to.atStartOfDay() : toDate;
        return service.getAllLogs(severity, hostname, logText, f, t, page, size);
    }

    /**
     * Get firewall syslogs với keyset pagination (hiệu năng cao hơn)
     * 
     * @param severity Filter by severity (optional)
     * @param hostname Filter by hostname (optional)
     * @param logText Search in log text (optional)
     * @param fromDate Start date filter (optional)
     * @param toDate End date filter (optional)
     * @param from Alternative start date (LocalDate) (optional)
     * @param to Alternative end date (LocalDate) (optional)
     * @param lastCreated Last created date from previous page (for keyset)
     * @param lastId Last ID from previous page (for keyset)
     * @param size Page size (default: 20, max: 200)
     * @return FirewallSysLogKeysetResponse with items and pagination info
     */
    @GetMapping("/syslogs/keyset")
    public FirewallSysLogKeysetResponse getLogsKeyset(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String hostname,
            @RequestParam(required = false) String logText,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime lastCreated,
            @RequestParam(required = false) Long lastId,
            @RequestParam(defaultValue = "20") int size
    ) {
        LocalDateTime f = from != null ? from.atStartOfDay() : fromDate;
        LocalDateTime t = to != null ? to.atStartOfDay() : toDate;
        return service.getLogsKeyset(severity, hostname, logText, f, t, lastCreated, lastId, size);
    }
}
