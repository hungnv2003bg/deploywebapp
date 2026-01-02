package com.foxconn.sopchecklist.dto;

import java.util.List;

public class OvertimeMonthSummaryDTO {
    private Integer year;
    private Integer month;
    private Double targetHours;
    private Double totalWeekdayHours;
    private Double totalSundayHours;
    private Double totalHours;
    private List<OvertimeUserSummaryDTO> users;

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public Double getTargetHours() {
        return targetHours;
    }

    public void setTargetHours(Double targetHours) {
        this.targetHours = targetHours;
    }

    public Double getTotalWeekdayHours() {
        return totalWeekdayHours;
    }

    public void setTotalWeekdayHours(Double totalWeekdayHours) {
        this.totalWeekdayHours = totalWeekdayHours;
    }

    public Double getTotalSundayHours() {
        return totalSundayHours;
    }

    public void setTotalSundayHours(Double totalSundayHours) {
        this.totalSundayHours = totalSundayHours;
    }

    public Double getTotalHours() {
        return totalHours;
    }

    public void setTotalHours(Double totalHours) {
        this.totalHours = totalHours;
    }

    public List<OvertimeUserSummaryDTO> getUsers() {
        return users;
    }

    public void setUsers(List<OvertimeUserSummaryDTO> users) {
        this.users = users;
    }
}

