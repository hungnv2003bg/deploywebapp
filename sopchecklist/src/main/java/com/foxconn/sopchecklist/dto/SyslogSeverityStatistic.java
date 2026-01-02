package com.foxconn.sopchecklist.dto;

import java.util.Map;

public class SyslogSeverityStatistic {
    private String severity;
    private Long total;
    private Map<String, Long> byArea;

    public SyslogSeverityStatistic() {
    }

    public SyslogSeverityStatistic(String severity, Long total, Map<String, Long> byArea) {
        this.severity = severity;
        this.total = total;
        this.byArea = byArea;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
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

