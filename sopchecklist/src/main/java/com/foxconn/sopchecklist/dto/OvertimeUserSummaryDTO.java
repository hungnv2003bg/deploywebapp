package com.foxconn.sopchecklist.dto;

public class OvertimeUserSummaryDTO {
    private Integer userId;
    private Double weekdayHours;
    private Double sundayHours;
    private Double totalHours;

    public OvertimeUserSummaryDTO() {
    }

    public OvertimeUserSummaryDTO(Integer userId, Double weekdayHours, Double sundayHours, Double totalHours) {
        this.userId = userId;
        this.weekdayHours = weekdayHours;
        this.sundayHours = sundayHours;
        this.totalHours = totalHours;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Double getWeekdayHours() {
        return weekdayHours;
    }

    public void setWeekdayHours(Double weekdayHours) {
        this.weekdayHours = weekdayHours;
    }

    public Double getSundayHours() {
        return sundayHours;
    }

    public void setSundayHours(Double sundayHours) {
        this.sundayHours = sundayHours;
    }

    public Double getTotalHours() {
        return totalHours;
    }

    public void setTotalHours(Double totalHours) {
        this.totalHours = totalHours;
    }
}

