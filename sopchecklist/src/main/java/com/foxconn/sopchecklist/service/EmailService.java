package com.foxconn.sopchecklist.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import javax.mail.MessagingException;
import javax.mail.internet.MimeMessage;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Service để gửi email qua Gmail SMTP
 * Thay thế stored procedure SQL
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Gửi email với HTML content
     * 
     * @param to Email người nhận (có thể nhiều, cách nhau bằng dấu phẩy)
     * @param cc Email CC (có thể nhiều, cách nhau bằng dấu phẩy)
     * @param bcc Email BCC (có thể nhiều, cách nhau bằng dấu phẩy)
     * @param subject Tiêu đề email
     * @param htmlBody Nội dung HTML của email
     * @throws MessagingException nếu gửi email thất bại
     */
    public void sendHtmlEmail(String to, String cc, String bcc, String subject, String htmlBody) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        // Parse và set TO addresses
        if (to != null && !to.trim().isEmpty()) {
            String[] toAddresses = parseEmailAddresses(to);
            helper.setTo(toAddresses);
            log.debug("TO addresses: {}", Arrays.toString(toAddresses));
        } else {
            throw new MessagingException("TO address is required");
        }

        // Parse và set CC addresses (optional)
        if (cc != null && !cc.trim().isEmpty()) {
            String[] ccAddresses = parseEmailAddresses(cc);
            helper.setCc(ccAddresses);
            log.debug("CC addresses: {}", Arrays.toString(ccAddresses));
        }

        // Parse và set BCC addresses (optional)
        if (bcc != null && !bcc.trim().isEmpty()) {
            String[] bccAddresses = parseEmailAddresses(bcc);
            helper.setBcc(bccAddresses);
            log.debug("BCC addresses: {}", Arrays.toString(bccAddresses));
        }

        // Set subject và body
        helper.setSubject(subject != null ? subject : "");
        helper.setText(htmlBody != null ? htmlBody : "", true); // true = HTML

        // Send email
        mailSender.send(message);
        log.info("Email sent successfully. Subject: {}, TO count: {}", 
                subject, to != null ? parseEmailAddresses(to).length : 0);
    }

    /**
     * Parse email addresses từ string (cách nhau bằng dấu phẩy hoặc dấu chấm phẩy)
     * Loại bỏ khoảng trắng và email rỗng
     */
    private String[] parseEmailAddresses(String emailString) {
        if (emailString == null || emailString.trim().isEmpty()) {
            return new String[0];
        }

        return Arrays.stream(emailString.split("[,;]"))
                .map(String::trim)
                .filter(email -> !email.isEmpty())
                .toArray(String[]::new);
    }

    /**
     * Gửi email đơn giản (text plain)
     */
    public void sendSimpleEmail(String to, String subject, String textBody) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        String[] toAddresses = parseEmailAddresses(to);
        helper.setTo(toAddresses);
        helper.setSubject(subject != null ? subject : "");
        helper.setText(textBody != null ? textBody : "", false); // false = plain text

        mailSender.send(message);
        log.info("Simple email sent successfully. Subject: {}, TO: {}", subject, to);
    }
}
