package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.dto.OvertimeMonthSummaryDTO;
import com.foxconn.sopchecklist.dto.OvertimeUserSummaryDTO;
import com.foxconn.sopchecklist.entity.AttendanceReport;
import com.foxconn.sopchecklist.entity.OvertimeConfig;
import com.foxconn.sopchecklist.repository.AttendanceReportRepository;
import com.foxconn.sopchecklist.repository.OvertimeConfigRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class OvertimeService {

    private final AttendanceReportRepository attendanceReportRepository;
    private final OvertimeConfigRepository overtimeConfigRepository;

    public OvertimeService(AttendanceReportRepository attendanceReportRepository, OvertimeConfigRepository overtimeConfigRepository) {
        this.attendanceReportRepository = attendanceReportRepository;
        this.overtimeConfigRepository = overtimeConfigRepository;
    }

    public OvertimeMonthSummaryDTO getMonthSummary(int year, int month, List<Integer> userIds) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<AttendanceReport> reports;
        if (userIds != null && !userIds.isEmpty()) {
            reports = attendanceReportRepository.findByUser_UserIDInAndAttendanceDateBetween(userIds, startDate, endDate);
        } else {
            reports = attendanceReportRepository.findByAttendanceDateBetween(startDate, endDate);
        }

        Map<Integer, Double> weekdayMap = new HashMap<>();
        Map<Integer, Double> sundayMap = new HashMap<>();

        for (AttendanceReport report : reports) {
            LocalDate date = report.getAttendanceDate();
            Double overtimeHours = report.getOvertimeHours();
            double hours = overtimeHours != null ? overtimeHours : 0.0;
            if (hours <= 0) {
                continue;
            }
            boolean isSunday = date.getDayOfWeek() == DayOfWeek.SUNDAY;
            Integer userId = report.getUser().getUserID();
            if (isSunday) {
                sundayMap.merge(userId, hours, Double::sum);
            } else {
                weekdayMap.merge(userId, hours, Double::sum);
            }
        }

        Set<Integer> userIdSet = new HashSet<>();
        if (userIds != null && !userIds.isEmpty()) {
            userIdSet.addAll(userIds);
        } else {
            for (AttendanceReport report : reports) {
                if (report.getUser() != null && report.getUser().getUserID() != null) {
                    userIdSet.add(report.getUser().getUserID());
                }
            }
        }

        List<OvertimeUserSummaryDTO> userSummaries = new ArrayList<>();
        double totalWeekday = 0.0;
        double totalSunday = 0.0;

        for (Integer userId : userIdSet) {
            double weekday = weekdayMap.getOrDefault(userId, 0.0);
            double sunday = sundayMap.getOrDefault(userId, 0.0);
            double total = weekday + sunday;
            weekday = roundHours(weekday);
            sunday = roundHours(sunday);
            total = roundHours(total);
            totalWeekday += weekday;
            totalSunday += sunday;
            OvertimeUserSummaryDTO dto = new OvertimeUserSummaryDTO(userId, weekday, sunday, total);
            userSummaries.add(dto);
        }

        totalWeekday = roundHours(totalWeekday);
        totalSunday = roundHours(totalSunday);
        double totalHours = roundHours(totalWeekday + totalSunday);

        userSummaries.sort((a, b) -> Double.compare(
                b.getTotalHours() != null ? b.getTotalHours() : 0.0,
                a.getTotalHours() != null ? a.getTotalHours() : 0.0
        ));

        OvertimeMonthSummaryDTO summary = new OvertimeMonthSummaryDTO();
        summary.setYear(year);
        summary.setMonth(month);
        summary.setTargetHours(getTargetHours(year, month));
        summary.setTotalWeekdayHours(totalWeekday);
        summary.setTotalSundayHours(totalSunday);
        summary.setTotalHours(totalHours);
        summary.setUsers(userSummaries);
        return summary;
    }

    public double getTargetHours(int year, int month) {
        Optional<OvertimeConfig> config = overtimeConfigRepository.findByYearAndMonth(year, month);
        return config.map(OvertimeConfig::getTargetHours).orElse(60.0);
    }

    public double getUserTargetHours(int year, int month, Integer userId) {
        if (userId != null) {
            Optional<OvertimeConfig> userConfig = overtimeConfigRepository.findByYearAndMonthAndUserId(year, month, userId);
            if (userConfig.isPresent()) {
                return userConfig.get().getTargetHours() != null ? userConfig.get().getTargetHours() : getTargetHours(year, month);
            }
        }
        return getTargetHours(year, month);
    }

    public List<Map<String, Object>> getTargetsForUsers(int year, int month, List<Integer> userIds) {
        List<Map<String, Object>> results = new ArrayList<>();
        if (userIds == null || userIds.isEmpty()) {
            return results;
        }
        double global = getTargetHours(year, month);
        for (Integer uid : userIds) {
            double target = getUserTargetHours(year, month, uid);
            Map<String, Object> m = new HashMap<>();
            m.put("userId", uid);
            m.put("targetHours", target);
            results.add(m);
        }
        return results;
    }

    public OvertimeConfig saveOrUpdateTargetHours(int year, int month, double targetHours) {
        Optional<OvertimeConfig> existing = overtimeConfigRepository.findByYearAndMonth(year, month);
        OvertimeConfig config;
        if (existing.isPresent()) {
            config = existing.get();
            config.setTargetHours(targetHours);
        } else {
            config = new OvertimeConfig();
            config.setYear(year);
            config.setMonth(month);
            config.setTargetHours(targetHours);
        }
        return overtimeConfigRepository.save(config);
    }

    public OvertimeConfig saveOrUpdateTargetHoursForUser(int year, int month, Integer userId, double targetHours, Integer editorUserId) {
        Optional<OvertimeConfig> existing = (userId != null)
                ? overtimeConfigRepository.findByYearAndMonthAndUserId(year, month, userId)
                : overtimeConfigRepository.findByYearAndMonth(year, month);
        OvertimeConfig config;
        if (existing.isPresent()) {
            config = existing.get();
            config.setTargetHours(targetHours);
        } else {
            config = new OvertimeConfig();
            config.setYear(year);
            config.setMonth(month);
            config.setTargetHours(targetHours);
            config.setUserId(userId);
        }
        config.setLastEditBy(editorUserId);
        return overtimeConfigRepository.save(config);
    }

    private double roundHours(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
