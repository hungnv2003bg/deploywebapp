package com.foxconn.sopchecklist.dto;

import java.util.Map;

public class SyslogSeverityStatusStatistic {
    private String severity;
    private Long pending; // Chờ thực hiện (status = 0)
    private Long doing; // Đang thực hiện (status = 1)
    private Long completed; // Hoàn thành (status = 2)
    private Long total;
    private Map<String, Long> byArea; // byArea format: { "VT1": total, "VT1_0": pending, "VT1_1": doing, "VT1_2": completed, "VT1_3": cancelled }

    public SyslogSeverityStatusStatistic() {
    }

    public SyslogSeverityStatusStatistic(String severity, Long pending, Long doing, Long completed, Long total, Map<String, Long> byArea) {
        this.severity = severity;
        this.pending = pending;
        this.doing = doing;
        this.completed = completed;
        this.total = total;
        this.byArea = byArea;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public Long getPending() {
        return pending;
    }

    public void setPending(Long pending) {
        this.pending = pending;
    }

    public Long getDoing() {
        return doing;
    }

    public void setDoing(Long doing) {
        this.doing = doing;
    }

    public Long getCompleted() {
        return completed;
    }

    public void setCompleted(Long completed) {
        this.completed = completed;
    }

    public Long getTotal() {
        return total;
    }

    public void setTotal(Long total) {
        this.total = total;
    }

    public Map<String, Long> getByArea() {
        return byArea;
    }

    public void setByArea(Map<String, Long> byArea) {
        this.byArea = byArea;
    }
}

