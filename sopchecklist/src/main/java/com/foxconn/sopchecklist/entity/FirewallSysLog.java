package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity cho firewall syslog data
 * Table: firewall_syslogs
 */
@Entity
@Table(name = "firewall_syslogs")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class FirewallSysLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "facility", length = 100)
    private String facility;

    @Column(name = "severity", length = 50)
    private String severity;

    @Column(name = "hostname", length = 300)
    private String hostname;

    @Lob
    @Column(name = "log_text", columnDefinition = "NTEXT")
    private String logText;

    @Column(name = "is_sync")
    private Boolean isSync;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "date_report")
    private LocalDateTime dateReport;
}
