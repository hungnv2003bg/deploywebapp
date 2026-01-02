package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity cho statistics syslog data
 * Table: statistics_syslogs
 * Dùng để aggregate statistics từ nhiều areas (VT2A, VT2B, VTC, VT1, DV)
 */
@Entity
@Table(name = "statistics_syslogs")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class StatisticsSysLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "severity", length = 50)
    private String severity;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "area", length = 50)
    private String area;
}
