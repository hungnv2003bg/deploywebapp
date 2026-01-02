package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonAlias;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "syslogs")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SysLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "factoryid")
    @JsonAlias({"factoryid"})
    private Integer factoryId;

    @Column(name = "userit_id")
    @JsonAlias({"userit_id"})
    private Integer userId;

    @Column(name = "severity", columnDefinition = "NVARCHAR(300)")
    private String severity;

    @Column(name = "hostname", columnDefinition = "NVARCHAR(300)")
    private String hostname;

    @Lob
    @Column(name = "log_text", columnDefinition = "NTEXT")
    private String logText;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "status")
    private Integer status;

    @Column(name = "action_taken", columnDefinition = "NVARCHAR(300)")
    private String actionTaken;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "collaborator", columnDefinition = "NVARCHAR(300)")
    private String collaborator;

    @Column(name = "syslog_deviceid")
    private Integer syslogDeviceId;

    @Column(name = "mail_sent")
    private Boolean mailSent; 

    @Column(name = "last_edited_at")
    private LocalDateTime lastEditedAt;

    @Column(name = "last_edited_by")
    private Long lastEditedBy;

    @OneToMany(mappedBy = "syslog", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<SyslogFile> files;
}


