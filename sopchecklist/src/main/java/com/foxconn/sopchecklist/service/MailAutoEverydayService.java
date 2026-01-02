package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.MailAutoEveryday;
import com.foxconn.sopchecklist.repository.MailAutoEverydayRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Service để quản lý cấu hình gửi email tự động hàng ngày
 */
@Service
public class MailAutoEverydayService {

    @Autowired
    private MailAutoEverydayRepository mailAutoEverydayRepository;

    /**
     * Lấy danh sách cấu hình email tự động đang bật theo type
     */
    public List<MailAutoEveryday> getActiveConfigsByType(String type) {
        return mailAutoEverydayRepository.findByTypeAndStatusTrue(type);
    }

    /**
     * Lấy tất cả cấu hình email tự động đang bật
     */
    public List<MailAutoEveryday> getAllActiveConfigs() {
        return mailAutoEverydayRepository.findByStatusTrue();
    }

    /**
     * Chuyển đổi time_send (HH:mm) thành cron expression
     * Ví dụ: "08:30" -> "0 30 8 * * ?"
     *        "13:30" -> "0 30 13 * * ?"
     */
    public String convertTimeToCronExpression(String timeSend) {
        try {
            LocalTime time = LocalTime.parse(timeSend, DateTimeFormatter.ofPattern("HH:mm"));
            int hour = time.getHour();
            int minute = time.getMinute();
            // Cron format: second minute hour day month day-of-week
            return String.format("0 %d %d * * ?", minute, hour);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid time format: " + timeSend + ". Expected format: HH:mm", e);
        }
    }

    /**
     * Lấy danh sách thời gian gửi email theo type (chỉ lấy các config đang bật)
     */
    public List<String> getSendTimesByType(String type) {
        return mailAutoEverydayRepository.findByTypeAndStatusTrue(type)
                .stream()
                .map(MailAutoEveryday::getTimeSend)
                .collect(java.util.stream.Collectors.toList());
    }
}

