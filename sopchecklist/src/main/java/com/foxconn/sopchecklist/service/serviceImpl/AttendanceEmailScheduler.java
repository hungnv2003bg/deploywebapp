package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.entity.MailAutoEveryday;
import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.service.AttendanceEmailService;
import com.foxconn.sopchecklist.service.CronMailAllSendService;
import com.foxconn.sopchecklist.service.MailAutoEverydayService;
import com.foxconn.sopchecklist.service.MailRecipientAllService;
import com.foxconn.sopchecklist.service.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Scheduler để gửi email báo cáo điểm danh hàng ngày
 * Đọc cấu hình từ bảng mail_auto_everyday (type = 'ATTENDANCE')
 * - Có thể cấu hình nhiều khung giờ gửi email
 * - Lần gửi đầu tiên trong ngày: Luôn gửi email
 * - Các lần gửi sau: Chỉ gửi nếu có thay đổi so với lần gửi trước
 * Gửi tới:
 * 1. Người thông báo nhận mail từ system settings (ATTENDANCE type)
 * 2. Tất cả nhân viên trong danh sách theo dõi
 */
@Component
public class AttendanceEmailScheduler {

    private static final Logger log = LoggerFactory.getLogger(AttendanceEmailScheduler.class);
    
    // Cache để lưu stats của lần gửi cuối cùng theo ngày
    private final Map<LocalDate, AttendanceEmailService.AttendanceStats> lastSentStatsCache = new ConcurrentHashMap<>();
    
    // Cache để track đã gửi email ở khung giờ nào trong ngày (format: "yyyy-MM-dd:HH:mm")
    private final Set<String> sentTodayCache = ConcurrentHashMap.newKeySet();

    @Autowired
    private AttendanceEmailService attendanceEmailService;

    @Autowired
    private CronMailAllSendService cronMailAllSendService;

    @Autowired
    private MailRecipientAllService mailRecipientAllService;

    @Autowired
    private MailAutoEverydayService mailAutoEverydayService;

    @Autowired(required = false)
    private TimeService timeService;

    /**
     * Chạy mỗi phút để check và gửi email theo cấu hình từ database
     * Đọc cấu hình từ bảng mail_auto_everyday với type = 'ATTENDANCE'
     */
    @Scheduled(cron = "0 * * * * ?", zone = "Asia/Ho_Chi_Minh") // Chạy mỗi phút
    @Transactional
    public void checkAndSendAttendanceEmail() {
        try {
            // Lấy cấu hình email tự động cho ATTENDANCE
            List<MailAutoEveryday> configs = mailAutoEverydayService.getActiveConfigsByType("ATTENDANCE");
            
            if (configs.isEmpty()) {
                return; // Không có cấu hình nào
            }

            LocalDateTime now = getNow();
            LocalDate today = now.toLocalDate();
            LocalTime currentTime = now.toLocalTime();
            
            // Chỉ check ở phút 0 (ví dụ: 8:30:00, 13:30:00) để tránh gửi nhiều lần
            if (currentTime.getSecond() != 0) {
                return;
            }

            String currentTimeStr = String.format("%02d:%02d", currentTime.getHour(), currentTime.getMinute());
            String cacheKey = today + ":" + currentTimeStr;

            // Check xem đã gửi ở khung giờ này chưa
            if (sentTodayCache.contains(cacheKey)) {
                return;
            }

            // Tìm config match với giờ hiện tại
            for (MailAutoEveryday config : configs) {
                if (config.getTimeSend().equals(currentTimeStr)) {
                    log.info("=== AttendanceEmailScheduler: Found config to send email at {} for date: {} ===", 
                        currentTimeStr, today);

                    // Tính attendance stats cho ngày hiện tại
                    AttendanceEmailService.AttendanceStats currentStats = 
                        attendanceEmailService.calculateAttendanceStats(today);
                    log.info("Calculated attendance stats: Overall rate: {}%, Total employees: {}", 
                        currentStats.overallRate, currentStats.totalEmployees);

                    // Lấy stats của lần gửi trước
                    AttendanceEmailService.AttendanceStats lastStats = lastSentStatsCache.get(today);

                    // Nếu là lần gửi đầu tiên trong ngày hoặc có thay đổi thì gửi
                    if (lastStats == null) {
                        log.info("First email of the day, sending email at {}", currentTimeStr);
                        sendAttendanceEmail(today, currentStats);
                        lastSentStatsCache.put(today, currentStats);
                        sentTodayCache.add(cacheKey);
                    } else {
                        // So sánh stats hiện tại với stats lần trước
                        if (hasStatsChanged(currentStats, lastStats)) {
                            log.info("Stats changed detected! Sending email at {}", currentTimeStr);
                            sendAttendanceEmail(today, currentStats);
                            lastSentStatsCache.put(today, currentStats);
                            sentTodayCache.add(cacheKey);
                        } else {
                            log.info("No changes detected, skipping email at {}", currentTimeStr);
                            // Vẫn đánh dấu đã check để không check lại
                            sentTodayCache.add(cacheKey);
                        }
                    }
                    break; // Chỉ gửi 1 lần mỗi phút
                }
            }
        } catch (Exception e) {
            log.error("Error in AttendanceEmailScheduler: ", e);
        }
    }

    /**
     * Gửi email attendance
     */
    private void sendAttendanceEmail(LocalDate date, AttendanceEmailService.AttendanceStats stats) {
        // Tạo HTML email
        String emailHtml = attendanceEmailService.createAttendanceEmailHtml(date, stats);

        // Tạo subject
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String subject = "Thông báo nhân viên IT đi làm / IT员工出勤通知: " + date.format(formatter);

        // Lấy email recipients từ system settings (ATTENDANCE type)
        RecipientGroups recipientGroups = getSystemRecipients();
        log.info("System recipients - TO: {}, CC: {}, BCC: {}",
            recipientGroups.to.size(), recipientGroups.cc.size(), recipientGroups.bcc.size());

        // Lấy email của tất cả employees trong tracking list
        List<String> trackingListEmails = attendanceEmailService.getTrackingListEmails();
        log.info("Found {} employees in tracking list", trackingListEmails.size());

        // Kết hợp tất cả email TO (loại bỏ trùng lặp)
        Set<String> toRecipients = new LinkedHashSet<>(recipientGroups.to);
        toRecipients.addAll(trackingListEmails);

        if (toRecipients.isEmpty() && recipientGroups.cc.isEmpty() && recipientGroups.bcc.isEmpty()) {
            log.warn("No recipients found, skipping email send");
            return;
        }

        String toCsv = String.join(",", toRecipients);
        String ccCsv = String.join(",", recipientGroups.cc);
        String bccCsv = String.join(",", recipientGroups.bcc);

        log.info("Sending attendance email - TO: {}, CC: {}, BCC: {}",
            toRecipients.size(), recipientGroups.cc.size(), recipientGroups.bcc.size());

        // Gửi email
        CronMailAll mail = cronMailAllSendService.sendMailCustom(
            "ATTENDANCE",
            toCsv,
            ccCsv.isEmpty() ? null : ccCsv,
            bccCsv.isEmpty() ? null : bccCsv,
            subject,
            emailHtml,
            null // referenceId
        );

        if (mail != null) {
            log.info("=== AttendanceEmailScheduler: Email sent successfully. Mail ID: {} ===", mail.getId());
        } else {
            log.error("=== AttendanceEmailScheduler: Failed to send email ===");
        }
    }

    /**
     * So sánh hai stats để xem có thay đổi không
     */
    private boolean hasStatsChanged(AttendanceEmailService.AttendanceStats current, 
                                    AttendanceEmailService.AttendanceStats previous) {
        // So sánh các giá trị chính
        if (current.totalEmployees != previous.totalEmployees ||
            current.present != previous.present ||
            current.halfDay != previous.halfDay ||
            current.absent != previous.absent ||
            current.leave != previous.leave ||
            current.weekendLeave != previous.weekendLeave ||
            current.overallRate != previous.overallRate) {
            return true;
        }

        // So sánh group stats
        if (current.groupStats.size() != previous.groupStats.size()) {
            return true;
        }

        // So sánh từng group
        Map<String, AttendanceEmailService.GroupStats> previousGroupMap = previous.groupStats.stream()
            .collect(Collectors.toMap(gs -> gs.name, gs -> gs));

        for (AttendanceEmailService.GroupStats currentGroup : current.groupStats) {
            AttendanceEmailService.GroupStats previousGroup = previousGroupMap.get(currentGroup.name);
            
            if (previousGroup == null) {
                return true; // Có group mới
            }

            if (currentGroup.totalEmployees != previousGroup.totalEmployees ||
                currentGroup.present != previousGroup.present ||
                currentGroup.halfDay != previousGroup.halfDay ||
                currentGroup.absent != previousGroup.absent ||
                currentGroup.leave != previousGroup.leave ||
                currentGroup.weekendLeave != previousGroup.weekendLeave ||
                currentGroup.rate != previousGroup.rate) {
                return true; // Có thay đổi trong group
            }
        }

        return false; // Không có thay đổi
    }

    /**
     * Lấy danh sách email recipients từ system settings (ATTENDANCE type)
     */
    private RecipientGroups getSystemRecipients() {
        RecipientGroups groups = new RecipientGroups();
        try {
            List<MailRecipientAll> recipients = mailRecipientAllService
                .findByTypeMailRecipientTypeNameAndEnabledTrue("ATTENDANCE");

            for (MailRecipientAll recipient : recipients) {
                if (recipient == null) continue;
                String email = recipient.getEmail();
                if (email == null || email.trim().isEmpty()) continue;
                String trimmed = email.trim();

                String type = recipient.getType();
                if (type == null || type.trim().isEmpty()) {
                    groups.to.add(trimmed);
                    continue;
                }

                switch (type.trim().toUpperCase()) {
                    case "CC":
                        groups.cc.add(trimmed);
                        break;
                    case "BCC":
                        groups.bcc.add(trimmed);
                        break;
                    default:
                        groups.to.add(trimmed);
                        break;
                }
            }
        } catch (Exception e) {
            log.error("Error getting system recipients: ", e);
        }
        return groups;
    }

    /**
     * Lấy ngày hiện tại
     */
    private LocalDate getToday() {
        if (timeService != null) {
            return timeService.nowVietnam().toLocalDate();
        }
        return LocalDate.now();
    }

    /**
     * Lấy thời gian hiện tại
     */
    private LocalDateTime getNow() {
        if (timeService != null) {
            return timeService.nowVietnam();
        }
        return LocalDateTime.now();
    }

    /**
     * Xóa cache cũ (giữ lại chỉ 7 ngày gần nhất để tránh memory leak)
     * Và xóa cache sentTodayCache mỗi ngày lúc 0:00
     */
    @Scheduled(cron = "0 0 0 * * ?", zone = "Asia/Ho_Chi_Minh") // Chạy mỗi ngày lúc 0:00
    public void cleanupOldCache() {
        LocalDate today = getToday();
        LocalDate cutoffDate = today.minusDays(7);
        
        lastSentStatsCache.entrySet().removeIf(entry -> entry.getKey().isBefore(cutoffDate));
        log.info("Cleaned up old cache entries before {}", cutoffDate);
        
        // Xóa cache sentTodayCache (chỉ giữ lại của ngày hôm nay)
        sentTodayCache.removeIf(key -> !key.startsWith(today.toString()));
        log.info("Cleaned up sentTodayCache, keeping only today's entries");
    }

    private static class RecipientGroups {
        private final Set<String> to = new LinkedHashSet<>();
        private final Set<String> cc = new LinkedHashSet<>();
        private final Set<String> bcc = new LinkedHashSet<>();
    }
}

