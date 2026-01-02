package com.foxconn.sopchecklist.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SysLogDTO {
    private Long id;
    private Integer factoryId;
    private String factoryName;
    private Integer userId;
    private String userFullName;
    private String deviceName;
    private String severity;
    private String hostname;
    private String logText;
    private LocalDateTime createdDate;
    private Integer status;
    private String actionTaken;
    private LocalDateTime completedAt;
    private String collaborator;
    private LocalDateTime lastEditedAt;
    private Long lastEditedBy;
    private List<SyslogFileDTO> files;
}

