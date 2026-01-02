package com.foxconn.sopchecklist.scheduler;

import com.foxconn.sopchecklist.entity.MailAutoEveryday;
import com.foxconn.sopchecklist.entity.SysLog;
import com.foxconn.sopchecklist.entity.SysLogUser;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.UserStatus;
import com.foxconn.sopchecklist.repository.SysLogRepository;
import com.foxconn.sopchecklist.repository.SysLogUserRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.CronMailAllSendService;
import com.foxconn.sopchecklist.service.MailAutoEverydayService;
import com.foxconn.sopchecklist.service.MailSyslogService;
import com.foxconn.sopchecklist.service.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class SyslogMailScheduler {

    private static final Logger log = LoggerFactory.getLogger(SyslogMailScheduler.class);

    // Cache để track đã gửi email ở khung giờ nào trong ngày (format:
    // "yyyy-MM-dd:HH:mm")
    private final Set<String> sentTodayCache = ConcurrentHashMap.newKeySet();

    @Autowired
    private SysLogRepository sysLogRepository;
    @Autowired
    private MailSyslogService mailSyslogService;
    @Autowired
    private CronMailAllSendService cronMailAllSendService;
    @Autowired
    private UsersRepository usersRepository;
    @Autowired
    private SysLogUserRepository sysLogUserRepository;
    @Autowired
    private MailAutoEverydayService mailAutoEverydayService;

    @Autowired(required = false)
    private TimeService timeService;

    @Value("${app.public.url:http://10.228.64.77:3000}")
    private String appPublicUrl;

    /**
     * Quét các syslog chưa gửi mail (mailSent = null/false) và gửi thông báo.
     * Mặc định chạy mỗi 10 phút, có thể cấu hình bằng syslog.mail.scheduleDelayMs
     * (ms).
     *
     * Để tránh spam: nếu trong một lần quét có nhiều bản ghi nội dung trùng
     * (khác id nhưng cùng severity + hostname + factory + user + collaborator +
     * logText),
     * chỉ gửi 1 email cho nhóm đó, nhưng sẽ mark tất cả là đã gửi.
     */
    @Scheduled(fixedDelayString = "${syslog.mail.scheduleDelayMs:600000}") // 10 phút
    @Transactional
    public void sendPendingSyslogMails() {
        Pageable limit = PageRequest.of(0, 1000); // giới hạn mỗi lần tránh tải quá nhiều
        List<SysLog> pending = sysLogRepository.findPendingMail(limit);
        if (pending == null || pending.isEmpty()) {
            return;
        }

        // Gom nhóm theo hostname, mỗi hostname chỉ gửi 1 email kèm số lượng log
        Map<String, SysLog> firstInGroup = new LinkedHashMap<>();
        Map<String, List<Long>> idsByGroup = new HashMap<>();

        for (SysLog sysLog : pending) {
            if (sysLog == null || sysLog.getId() == null)
                continue;
            String key = buildSignature(sysLog);
            idsByGroup.computeIfAbsent(key, k -> new ArrayList<>()).add(sysLog.getId());
            firstInGroup.putIfAbsent(key, sysLog);
        }

        List<Long> sentIds = new ArrayList<>();
        for (SysLog sysLog : firstInGroup.values()) {
            try {
                String key = buildSignature(sysLog);
                int count = idsByGroup.getOrDefault(key, List.of()).size();
                mailSyslogService.sendSyslogNotification(sysLog, count);
                // đánh dấu tất cả id trong nhóm đã gửi
                sentIds.addAll(idsByGroup.getOrDefault(key, List.of()));
            } catch (Exception e) {
                System.err.println("Error sending syslog mail for id " + sysLog.getId() + ": " + e.getMessage());
            }
        }

        if (!sentIds.isEmpty()) {
            sysLogRepository.markMailSent(sentIds);
        }
    }

    /**
     * Chạy mỗi phút để check và gửi email Syslog theo cấu hình từ database
     * Đọc cấu hình từ bảng mail_auto_everyday với type = 'SYSLOG'
     */
    @Scheduled(cron = "0 * * * * ?", zone = "Asia/Ho_Chi_Minh") // Chạy mỗi phút
    @Transactional(readOnly = true)
    public void checkAndSendDailySyslogSummary() {
        try {
            // Lấy cấu hình email tự động cho SYSLOG
            List<MailAutoEveryday> configs = mailAutoEverydayService.getActiveConfigsByType("SYSLOG");

            if (configs.isEmpty()) {
                return; // Không có cấu hình nào
            }

            LocalDateTime now = getNow();
            LocalDate today = now.toLocalDate();
            LocalTime currentTime = now.toLocalTime();

            // Chỉ check ở giây thứ 0 để tránh gửi nhiều lần
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
                    log.info("=== SyslogMailScheduler: Found config to send email at {} for date: {} ===",
                            currentTimeStr, today);

                    // Gửi email
                    sendDailySyslogSummaryEmail();

                    // Đánh dấu đã gửi
                    sentTodayCache.add(cacheKey);
                    break; // Chỉ gửi 1 lần mỗi phút
                }
            }
        } catch (Exception e) {
            log.error("Error in checkAndSendDailySyslogSummary: ", e);
        }
    }

    /**
     * Gửi email tổng kết Syslog hàng ngày
     * Logic từ method sendDailyOpenSyslogSummary cũ
     */
    private void sendDailySyslogSummaryEmail() {
        List<Object[]> raw = sysLogRepository.countOpenByUserAndFactory();
        if (raw == null || raw.isEmpty()) {
            return;
        }

        List<Users> allUsers = usersRepository.findAll();
        Map<Integer, Users> usersById = allUsers.stream()
                .collect(Collectors.toMap(Users::getUserID, u -> u, (a, b) -> a));

        List<SysLogUser> allSyslogUsers = sysLogUserRepository.findAll();
        Map<Integer, String> factoryNamesById = allSyslogUsers.stream()
                .filter(su -> su.getFactoryId() != null)
                .collect(Collectors.toMap(SysLogUser::getFactoryId, SysLogUser::getFactoryName, (a, b) -> a));

        Map<Integer, Map<Integer, Long>> countsByUserAndFactory = new HashMap<>();
        for (Object[] row : raw) {
            if (row == null || row.length < 3 || row[0] == null) {
                continue;
            }
            Integer userId = ((Number) row[0]).intValue();
            Integer factoryId = row[1] != null ? ((Number) row[1]).intValue() : null;
            Long count = ((Number) row[2]).longValue();

            Map<Integer, Long> factoryMap = countsByUserAndFactory.computeIfAbsent(userId, k -> new HashMap<>());
            if (factoryId == null) {
                factoryId = -1;
            }
            factoryMap.merge(factoryId, count, Long::sum);
        }

        for (Map.Entry<Integer, Map<Integer, Long>> entry : countsByUserAndFactory.entrySet()) {
            Integer userId = entry.getKey();
            Map<Integer, Long> factoryCounts = entry.getValue();

            Users user = usersById.get(userId);
            if (user == null || user.getStatus() != UserStatus.ACTIVE) {
                continue;
            }
            String email = user.getEmail();
            if (email == null || email.trim().isEmpty()) {
                continue;
            }

            long totalCount = factoryCounts.values().stream().mapToLong(Long::longValue).sum();
            if (totalCount <= 0) {
                continue;
            }

            String subject = buildSummarySubject(user, totalCount);
            String body = buildSummaryBody(user, factoryCounts, factoryNamesById, totalCount);

            String toCsv = email.trim();
            cronMailAllSendService.sendMailCustom("SYSLOG_DAILY_SUMMARY", toCsv, null, null, subject, body, null);
        }
    }

    private String buildSignature(SysLog s) {
        return String.join("|",
                safeLower(s.getHostname()));
    }

    private String safeLower(String v) {
        if (v == null)
            return "";
        return v.trim().toLowerCase();
    }

    private String buildSummarySubject(Users user, long totalCount) {
        String name = user.getFullName() != null ? user.getFullName().trim() : "";
        if (name.isEmpty()) {
            name = user.getEmail();
        }
        return "Thông báo Syslog chưa xử lý / Syslog 待处理通知: " + name + " (" + totalCount + " log)";
    }

    private String buildSummaryBody(Users user,
            Map<Integer, Long> factoryCounts,
            Map<Integer, String> factoryNamesById,
            long totalCount) {
        StringBuilder body = new StringBuilder();
        body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
        body.append(
                "<h2 style=\"margin:0 0 12px;color:#d32f2f;\">Thông báo bạn có Syslog chưa xử lý / 您有尚未处理的 Syslog</h2>");
        body.append(
                "<p>Danh sách dưới đây là các Syslog đang ở trạng thái <strong>Chờ xử lý</strong> hoặc <strong>Đang xử lý</strong> tính đến thời điểm gửi mail này. / 下表为截至发信时状态为<strong>待处理</strong>或<strong>处理中</strong>的 Syslog。</p>");

        body.append("<table style=\"border-collapse:collapse;width:100%;border:1px solid #ddd;margin-top:12px;\">");
        body.append("<thead>");
        body.append("<tr>");
        body.append("<th style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Khu vực / 区域</th>");
        body.append("<th style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Người phụ trách / 负责人</th>");
        body.append("<th style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Số lượng / 数量</th>");
        body.append("</tr>");
        body.append("</thead>");
        body.append("<tbody>");

        String userName = user.getFullName() != null ? user.getFullName().trim() : user.getEmail();
        for (Map.Entry<Integer, Long> fcEntry : factoryCounts.entrySet()) {
            Integer factoryId = fcEntry.getKey();
            Long count = fcEntry.getValue();
            if (count == null || count <= 0) {
                continue;
            }
            String factoryName;
            if (factoryId == null || factoryId == -1) {
                factoryName = "-";
            } else {
                factoryName = factoryNamesById.getOrDefault(factoryId, "-");
            }

            body.append("<tr>");
            body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(factoryName))
                    .append("</td>");
            body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(userName))
                    .append("</td>");
            body.append("<td style=\"border:1px solid #ddd;padding:8px;text-align:right;\">").append(count)
                    .append("</td>");
            body.append("</tr>");
        }

        body.append("</tbody>");
        body.append("</table>");

        body.append("<p style=\"margin-top:12px;\">Tổng cộng: <strong>").append(totalCount)
                .append("</strong> syslog chưa xử lý hoặc đang xử lý. / 共 <strong>").append(totalCount)
                .append("</strong> 条 syslog 处于待处理或处理中状态。</p>");

        try {
            String link = appPublicUrl + "/syslog";
            body.append("<p style=\"margin-top:12px;\"><a href=\"")
                    .append(link)
                    .append("\" style=\"display:inline-block;background:#1677ff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Mở syslogs / 打开 syslogs</a></p>");
        } catch (Exception ignore) {
        }

        body.append(
                "<p style=\"margin-top:16px;color:#666;font-size:12px;\">Vui lòng kiểm tra và xử lý các syslog này sớm nhất có thể. / 请尽快检查并处理上述 syslog。</p>");
        body.append("<p style=\"margin-top:8px;color:#999;font-size:11px;font-style:italic;\">此邮件为自动发送，请勿回复！</p>");
        body.append("<p style=\"margin-top:12px;\"><strong>Trân trọng / 此致,</strong></p>");
        body.append("</div>");

        return body.toString();
    }

    private String escapeHtml(String input) {
        if (input == null)
            return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
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
     * Xóa cache mỗi ngày lúc 0:00
     */
    @Scheduled(cron = "0 0 0 * * ?", zone = "Asia/Ho_Chi_Minh")
    public void cleanupSentCache() {
        LocalDate today = getNow().toLocalDate();
        sentTodayCache.removeIf(key -> !key.startsWith(today.toString()));
        log.info("Cleaned up Syslog sentTodayCache, keeping only today's entries");
    }
}
