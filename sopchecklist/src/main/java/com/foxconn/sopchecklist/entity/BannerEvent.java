package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

import javax.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "banner_event")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class BannerEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Nationalized
    @Column(name = "name_event", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String nameEvent;

    @Column(name = "startdate", nullable = false)
    private LocalDate startDate;

    @Column(name = "enddate", nullable = false)
    private LocalDate endDate;

    @Column(name = "status", nullable = false)
    private Boolean status = true;

    @Nationalized
    @Column(name = "message_vi", columnDefinition = "NVARCHAR(2000)")
    private String messageVi;

    @Nationalized
    @Column(name = "message_zh", columnDefinition = "NVARCHAR(2000)")
    private String messageZh;
}
