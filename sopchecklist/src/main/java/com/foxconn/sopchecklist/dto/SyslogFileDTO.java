package com.foxconn.sopchecklist.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SyslogFileDTO {
    private Long id;
    private String filePath;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private LocalDateTime createdAt;
}

