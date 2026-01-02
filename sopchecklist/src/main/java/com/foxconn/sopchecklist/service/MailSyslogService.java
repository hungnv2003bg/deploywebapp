package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.SysLog;

public interface MailSyslogService {
    /**
     * Gửi email thông báo khi có syslog mới được tạo
     * @param sysLog Syslog mới được tạo
     * @param totalCount Số lượng syslog cùng hostname trong đợt quét
     */
    void sendSyslogNotification(SysLog sysLog, int totalCount);
}

