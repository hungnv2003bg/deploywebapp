package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonBackReference;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "syslog_files")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SyslogFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "syslog_id", nullable = false)
    @JsonBackReference
    private SysLog syslog;

    @Column(name = "file_path", nullable = false, columnDefinition = "NVARCHAR(1000)")
    private String filePath;

    @Column(name = "file_name", nullable = false, columnDefinition = "NVARCHAR(400)")
    private String fileName;

    @Column(name = "file_type", columnDefinition = "NVARCHAR(50)")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}

