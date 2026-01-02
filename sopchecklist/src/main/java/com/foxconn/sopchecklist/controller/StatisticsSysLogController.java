package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.dto.SyslogSeverityStatistic;
import com.foxconn.sopchecklist.service.StatisticsSysLogService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Controller cho Statistics Syslog
 * Endpoints: /api/syslog-statistics/*
 * 
 * Note: Đặt tên khác với SysLogController hiện tại để tránh conflict
 */
@RestController
@RequestMapping("/api/syslog-statistics")
@CrossOrigin
public class StatisticsSysLogController {

    private final StatisticsSysLogService service;

    public StatisticsSysLogController(StatisticsSysLogService service) {
        this.service = service;
    }

    /**
     * Get statistics cho một severity cụ thể
     * 
     * @param area Area filter (ALL, VT2A, VT2B, VTC, VT1, DV) (default: ALL)
     * @param severity Severity level (optional)
     * @param from Start date filter (optional)
     * @param to End date filter (optional)
     * @return Map<area, count>
     */
    @GetMapping("/statistic")
    public Map<String, Long> statistic(
            @RequestParam(defaultValue = "ALL") String area,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return service.statistic(area, severity, from, to);
    }

    /**
     * Get statistics cho tất cả severities
     * 
     * @param area Area filter (ALL, VT2A, VT2B, VTC, VT1, DV) (default: ALL)
     * @param from Start date filter (optional)
     * @param to End date filter (optional)
     * @return Map<severity, Map<area, count>>
     */
    @GetMapping("/statistic/bulk")
    public Map<String, Map<String, Long>> statisticAll(
            @RequestParam(defaultValue = "ALL") String area,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return service.statisticAllSeverities(area, from, to);
    }

    /**
     * Get statistics cho tất cả severities với total đã tính sẵn
     * Frontend chỉ cần nhận và hiển thị, không cần tính toán gì thêm
     * 
     * @param area Area filter (ALL, VT2A, VT2B, VTC, VT1, DV) (default: ALL)
     * @param from Start date filter (optional)
     * @param to End date filter (optional)
     * @return List<SyslogSeverityStatistic> đã sắp xếp theo thứ tự severity
     */
    @GetMapping("/statistic/bulk/processed")
    public List<SyslogSeverityStatistic> statisticAllProcessed(
            @RequestParam(defaultValue = "ALL") String area,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return service.statisticAllSeveritiesWithTotal(area, from, to);
    }

    /**
     * Get danh sách areas có trong database
     * 
     * @return List of area names
     */
    @GetMapping("/areas")
    public List<String> getAreas() {
        return service.getAvailableAreas();
    }
}
