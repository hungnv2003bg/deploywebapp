package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.dto.SyslogSeverityStatistic;
import com.foxconn.sopchecklist.repository.StatisticsSysLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service cho StatisticsSysLog
 * Xử lý aggregate statistics từ statistics_syslogs table
 */
@Service
public class StatisticsSysLogService {

    private final StatisticsSysLogRepository repository;
    
    private static final List<String> SEVERITY_LEVELS = Arrays.asList(
            "Emergency", "Alert", "Critical", "Error", "Warning", "Notice", "Info", "Debug"
    );

    public StatisticsSysLogService(StatisticsSysLogRepository repository) {
        this.repository = repository;
    }

    /**
     * Get statistics cho một severity cụ thể
     * Trả về Map<area, count>
     */
    public Map<String, Long> statistic(String area, String severity, LocalDateTime from, LocalDateTime to) {
        String normalizedArea = normalizeArea(area);
        String normalizedSeverity = StringUtils.hasText(severity) ? severity : null;

        if ("ALL".equals(normalizedArea)) {
            // Nếu area = ALL, group by area
            List<Object[]> results = repository.countBySeverityGroupByArea(normalizedSeverity, from, to);
            Map<String, Long> map = new HashMap<>();
            for (Object[] row : results) {
                String areaName = (String) row[0];
                Long count = ((Number) row[1]).longValue();
                map.put(areaName, count);
            }
            return map;
        } else {
            // Nếu area cụ thể, chỉ trả về count cho area đó
            long count = repository.countBySeverity(normalizedSeverity, normalizedArea, from, to);
            Map<String, Long> map = new HashMap<>();
            map.put(normalizedArea, count);
            return map;
        }
    }

    /**
     * Get statistics cho tất cả severities
     * Trả về Map<severity, Map<area, count>>
     */
    public Map<String, Map<String, Long>> statisticAllSeverities(String area, LocalDateTime from, LocalDateTime to) {
        Map<String, Map<String, Long>> result = new LinkedHashMap<>();
        for (String severity : SEVERITY_LEVELS) {
            result.put(severity, statistic(area, severity, from, to));
        }
        return result;
    }

    /**
     * Get statistics cho tất cả severities với total đã tính sẵn
     * Trả về List<SyslogSeverityStatistic> đã sắp xếp theo thứ tự severity
     */
    public List<SyslogSeverityStatistic> statisticAllSeveritiesWithTotal(String area, LocalDateTime from, LocalDateTime to) {
        List<SyslogSeverityStatistic> result = new ArrayList<>();
        for (String severity : SEVERITY_LEVELS) {
            Map<String, Long> byArea = statistic(area, severity, from, to);
            // Tính tổng từ tất cả các giá trị trong byArea
            Long total = byArea.values().stream()
                    .mapToLong(Long::longValue)
                    .sum();
            result.add(new SyslogSeverityStatistic(severity, total, byArea));
        }
        return result;
    }

    /**
     * Get danh sách areas có trong database
     */
    public List<String> getAvailableAreas() {
        return repository.findDistinctAreas();
    }

    private String normalizeArea(String area) {
        if (!StringUtils.hasText(area)) {
            return "ALL";
        }
        return area.toUpperCase(Locale.US);
    }
}
