package com.foxconn.sopchecklist.dto;

public class UserAttendanceSimpleDTO {
    private Long id;
    private Integer userId;
    private Boolean isActive;
    private String shift;

    public UserAttendanceSimpleDTO() {}

    public UserAttendanceSimpleDTO(Long id, Integer userId, Boolean isActive, String shift) {
        this.id = id;
        this.userId = userId;
        this.isActive = isActive;
        this.shift = shift;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public String getShift() {
        return shift;
    }

    public void setShift(String shift) {
        this.shift = shift;
    }
}
