package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.*;
import com.foxconn.sopchecklist.repository.MailRecipientAllRepository;
import com.foxconn.sopchecklist.repository.SysLogUserRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.CronMailAllSendService;
import com.foxconn.sopchecklist.service.MailSyslogService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MailSyslogServiceImpl implements MailSyslogService {

    private final CronMailAllSendService cronMailAllSendService;
    private final MailRecipientAllRepository mailRecipientRepository;
    private final UsersRepository usersRepository;
    private final SysLogUserRepository sysLogUserRepository;

    @Value("${app.public.url:http://10.228.64.77:3000}")
    private String appPublicUrl;
    
    @Value("${syslog.mail.scheduleDelayMs:600000}")
    private long syslogMailDelayMs;

    public MailSyslogServiceImpl(CronMailAllSendService cronMailAllSendService,
                                 MailRecipientAllRepository mailRecipientRepository,
                                 UsersRepository usersRepository,
                                 SysLogUserRepository sysLogUserRepository) {
        this.cronMailAllSendService = cronMailAllSendService;
        this.mailRecipientRepository = mailRecipientRepository;
        this.usersRepository = usersRepository;
        this.sysLogUserRepository = sysLogUserRepository;
    }

    @Override
    public void sendSyslogNotification(SysLog sysLog, int totalCount) {
        if (sysLog == null || sysLog.getSeverity() == null) {
            return;
        }

        String severity = sysLog.getSeverity().trim();
        
        // Lấy recipients từ cấu hình cho severity này
        List<String> configuredTo = getRecipients(severity, "TO");
        List<String> configuredCc = getRecipients(severity, "CC");
        List<String> configuredBcc = getRecipients(severity, "BCC");

        // Lấy email của người phụ trách từ userId
        Set<String> responsibleEmails = new LinkedHashSet<>();
        Integer userId = sysLog.getUserId();
        if (userId != null) {
            usersRepository.findById(userId)
                .ifPresent(user -> {
                    if (isActiveUser(user) && user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
                        responsibleEmails.add(user.getEmail().trim());
                    }
                });
        }

        // Resolve email từ collaborator nếu có (có thể chứa tên người dùng phân cách bằng dấu phẩy)
        if (sysLog.getCollaborator() != null && !sysLog.getCollaborator().trim().isEmpty()) {
            String collaborator = sysLog.getCollaborator().trim();
            String[] names = collaborator.split(",");
            for (String name : names) {
                String email = resolveEmailFromName(name.trim());
                if (email != null && !email.isEmpty()) {
                    // Nếu có nhiều email (từ group), split và thêm từng email
                    String[] emails = email.split(",");
                    for (String e : emails) {
                        String trimmedEmail = e.trim();
                        if (!trimmedEmail.isEmpty()) {
                            responsibleEmails.add(trimmedEmail);
                        }
                    }
                }
            }
        }

        // Kết hợp tất cả email TO (người phụ trách + cấu hình)
        Set<String> allToEmails = new LinkedHashSet<>(responsibleEmails);
        allToEmails.addAll(configuredTo);

        // Nếu không có recipients nào, không gửi email
        if (allToEmails.isEmpty() && configuredCc.isEmpty() && configuredBcc.isEmpty()) {
            return;
        }

        String subject = buildSubject(sysLog, totalCount);
        String body = buildBody(sysLog, totalCount);

        String toCsv = String.join(",", allToEmails);
        String ccCsv = String.join(",", configuredCc);
        String bccCsv = String.join(",", configuredBcc);

        // Gửi email
        cronMailAllSendService.sendMailCustom(severity, toCsv, ccCsv, bccCsv, subject, body, sysLog.getId());
    }

    private List<String> getRecipients(String severity, String recipientType) {
        try {
            List<MailRecipientAll> recipients = mailRecipientRepository
                .findByTypeAndTypeMailRecipientTypeNameAndEnabledTrue(recipientType, severity);
            return recipients.stream()
                .map(MailRecipientAll::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .map(String::trim)
                .distinct()
                .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Error getting recipients for severity " + severity + ": " + e.getMessage());
            return new ArrayList<>();
        }
    }

    private String buildSubject(SysLog sysLog, int totalCount) {
        String severity = sysLog.getSeverity() != null ? sysLog.getSeverity() : "Syslog";
        String hostname = sysLog.getHostname() != null ? sysLog.getHostname() : "";
        int count = Math.max(totalCount, 1);
        return String.format("Thông báo Syslog %s / Syslog 通知 %s: %s (%d log)", severity, severity, hostname, count);
    }

    private String buildBody(SysLog sysLog, int totalCount) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        StringBuilder body = new StringBuilder();
        
        // Lấy thông tin bổ sung
        String factoryName = getFactoryName(sysLog.getFactoryId());
        String userFullName = getUserFullName(sysLog.getUserId());
        String collaboratorDisplay = getCollaboratorDisplay(sysLog.getCollaborator());
        
        body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
        body.append("<h2 style=\"margin:0 0 12px;color:#d32f2f;\">Thông báo Syslog mới / 新 Syslog 通知</h2>");
        body.append("<table style=\"border-collapse:collapse;width:100%;border:1px solid #ddd;\">");
        
        row(body, "Cấp độ / 级别", sysLog.getSeverity() != null ? sysLog.getSeverity() : "-");
        row(body, "Hostname", sysLog.getHostname() != null ? sysLog.getHostname() : "-");
        int minutes = (int) Math.max(1, Math.round(syslogMailDelayMs / 60000.0));
        String logCountLabel = "Số lượng log (" + minutes + " phút) / " + minutes + "分钟内日志数量";
        row(body, logCountLabel, String.valueOf(Math.max(totalCount, 1)));
        
        if (factoryName != null && !factoryName.trim().isEmpty()) {
            row(body, "Khu vực / 区域", factoryName);
        }
        
        if (userFullName != null && !userFullName.trim().isEmpty()) {
            row(body, "Người phụ trách / 负责人", userFullName);
        }
        
        if (collaboratorDisplay != null && !collaboratorDisplay.trim().isEmpty()) {
            row(body, "Người phối hợp / 协作人", collaboratorDisplay);
        }
        
        row(body, "Ngày tạo / 创建日期", 
            sysLog.getCreatedDate() != null ? sysLog.getCreatedDate().format(fmt) : "-");
        row(body, "Trạng thái / 状态", getStatusDisplay(sysLog.getStatus()));
        
        if (sysLog.getActionTaken() != null && !sysLog.getActionTaken().trim().isEmpty()) {
            row(body, "Cách xử lý / 处理方式", sysLog.getActionTaken());
        }
        
        if (sysLog.getLogText() != null && !sysLog.getLogText().trim().isEmpty()) {
            String logText = sysLog.getLogText();
            // Giới hạn độ dài để tránh email quá dài
            if (logText.length() > 1000) {
                logText = logText.substring(0, 1000) + "...";
            }
            row(body, "Log", logText.replace("\n", "<br>"));
        }
        
        body.append("</table>");
        
        // Deep link tới trang syslog detail
        try {
            String appBase = appPublicUrl;
            Long syslogId = sysLog.getId();
            if (syslogId != null) {
                String link = appBase + "/syslog?id=" + syslogId;
                body.append("<p style=\"margin-top:12px;\"><a href=\"")
                        .append(link)
                        .append("\" style=\"display:inline-block;background:#1677ff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Mở chi tiết syslog / 打开 syslog 详情</a></p>");
            }
        } catch (Exception ignore) {}
        
        body.append("<p style=\"margin-top:16px;color:#666;font-size:12px;\">");
        body.append("Vui lòng kiểm tra và xử lý syslog này sớm nhất có thể. / 请尽快检查并处理此 syslog。");
        body.append("</p>");
        body.append("<p style=\"margin-top:8px;color:#999;font-size:11px;font-style:italic;\">");
        body.append("此邮件为自动发送，请勿回复！");
        body.append("</p>");
        body.append("<p style=\"margin-top:12px;\"><strong>Trân trọng / 此致,</strong></p>");
        body.append("</div>");
        
        return body.toString();
    }
    
    private String getFactoryName(Integer factoryId) {
        if (factoryId == null) {
            return null;
        }
        try {
            return sysLogUserRepository.findByFactoryId(factoryId)
                .map(SysLogUser::getFactoryName)
                .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }
    
    private String getUserFullName(Integer userId) {
        if (userId == null) {
            return null;
        }
        try {
            return usersRepository.findById(userId)
                .map(Users::getFullName)
                .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Chuẩn hóa hiển thị collaborator: hỗ trợ user:<id>, email, mã NV hoặc full name
     */
    private String getCollaboratorDisplay(String collaboratorRaw) {
        if (collaboratorRaw == null || collaboratorRaw.trim().isEmpty()) {
            return null;
        }

        List<String> result = new ArrayList<>();
        String[] parts = collaboratorRaw.split(",");

        for (String part : parts) {
            String item = part != null ? part.trim() : "";
            if (item.isEmpty()) continue;
            String lower = item.toLowerCase();

            // user:<id>
            try {
                if (lower.startsWith("user:")) {
                    Integer uid = Integer.parseInt(lower.substring("user:".length()).trim());
                    String name = usersRepository.findById(uid)
                        .map(u -> {
                            if (u.getFullName() != null && !u.getFullName().trim().isEmpty()) return u.getFullName().trim();
                            if (u.getManv() != null && !u.getManv().trim().isEmpty()) return u.getManv().trim();
                            return u.getEmail();
                        })
                        .orElse(null);
                    if (name != null && !name.trim().isEmpty()) {
                        result.add(name.trim());
                        continue;
                    }
                }
            } catch (Exception ignore) {}

            // email -> ưu tiên fullName nếu tìm thấy
            if (item.contains("@")) {
                Optional<Users> userByEmail = usersRepository.findByEmail(item);
                if (userByEmail.isPresent()) {
                    Users u = userByEmail.get();
                    if (u.getFullName() != null && !u.getFullName().trim().isEmpty()) {
                        result.add(u.getFullName().trim());
                        continue;
                    }
                }
                result.add(item);
                continue;
            }

            // mã nhân viên
            Optional<Users> userByManv = usersRepository.findByManv(item);
            if (userByManv.isPresent()) {
                Users u = userByManv.get();
                if (u.getFullName() != null && !u.getFullName().trim().isEmpty()) {
                    result.add(u.getFullName().trim());
                    continue;
                }
            }

            // Nếu là chuỗi số thuần, thử coi như userId
            if (item.matches("\\d+")) {
                try {
                    Integer uid = Integer.parseInt(item);
                    String name = usersRepository.findById(uid)
                        .map(u -> {
                            if (u.getFullName() != null && !u.getFullName().trim().isEmpty()) return u.getFullName().trim();
                            if (u.getManv() != null && !u.getManv().trim().isEmpty()) return u.getManv().trim();
                            return u.getEmail();
                        })
                        .orElse(null);
                    if (name != null && !name.trim().isEmpty()) {
                        result.add(name.trim());
                        continue;
                    }
                } catch (Exception ignore) {}
            }

            // full name khớp chính xác
            List<Users> allUsers = usersRepository.findAll();
            String matchedFullName = allUsers.stream()
                .filter(u -> u.getFullName() != null && u.getFullName().trim().equalsIgnoreCase(item))
                .map(Users::getFullName)
                .findFirst()
                .orElse(null);
            if (matchedFullName != null && !matchedFullName.trim().isEmpty()) {
                result.add(matchedFullName.trim());
                continue;
            }

            // fallback: giữ nguyên
            result.add(item);
        }

        return result.isEmpty() ? null : String.join(", ", result);
    }
    
    private void row(StringBuilder body, String name, String value) {
        body.append("<tr>");
        body.append("<td style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;font-weight:bold;width:200px;\">")
            .append(escapeHtml(name)).append("</td>");
        body.append("<td style=\"border:1px solid #ddd;padding:8px;\">")
            .append(escapeHtml(value)).append("</td>");
        body.append("</tr>");
    }

    private String getStatusDisplay(Integer status) {
        if (status == null) return "-";
        switch (status) {
            case 0: return "Chờ xử lý / 待处理";
            case 1: return "Đang xử lý / 处理中";
            case 2: return "Hoàn thành / 已完成";
            case 3: return "Đã hủy / 已取消";
            default: return "Status " + status;
        }
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }

    /**
     * Resolve email từ tên người dùng (có thể là fullName, manv, email, hoặc user:ID, group:ID)
     */
    private String resolveEmailFromName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return null;
        }
        
        String trimmedName = name.trim();
        String lower = trimmedName.toLowerCase();
        
        // Handle encoded identifiers: group:<id>, user:<id>
        try {
            if (lower.startsWith("group:")) {
                // Group handling - skip for now, có thể thêm sau nếu cần
                return null;
            } else if (lower.startsWith("user:")) {
                String idStr = lower.substring("user:".length()).trim();
                Integer uid = Integer.parseInt(idStr);
                return usersRepository.findById(uid)
                    .filter(this::isActiveUser)
                    .map(Users::getEmail)
                    .filter(e -> e != null && !e.trim().isEmpty())
                    .orElse(null);
            }
        } catch (Exception ignore) {
            // Continue to other resolution methods
        }
        
        // Nếu là email trực tiếp
        if (trimmedName.contains("@")) {
            return usersRepository.findByEmail(trimmedName)
                .filter(this::isActiveUser)
                .map(Users::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .orElse(trimmedName); // Nếu không tìm thấy trong DB, vẫn trả về email đó
        }
        
        // Tìm theo mã nhân viên (manv)
        Optional<Users> userByManv = usersRepository.findByManv(trimmedName);
        if (userByManv.isPresent()) {
            Users user = userByManv.get();
            if (isActiveUser(user) && user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
                return user.getEmail();
            }
        }
        
        // Tìm theo fullName (duyệt danh sách)
        List<Users> allUsers = usersRepository.findAll();
        return allUsers.stream()
            .filter(this::isActiveUser)
            .filter(u -> u.getFullName() != null && u.getFullName().trim().equalsIgnoreCase(trimmedName))
            .map(Users::getEmail)
            .filter(e -> e != null && !e.trim().isEmpty())
            .findFirst()
            .orElse(null);
    }

    /**
     * Kiểm tra user có active không
     */
    private boolean isActiveUser(Users user) {
        return user != null && user.getStatus() == UserStatus.ACTIVE;
    }
}

