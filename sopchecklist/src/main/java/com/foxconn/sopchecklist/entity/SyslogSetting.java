package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "syslog_setting")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SyslogSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Danh sách severity được phép hiển thị, lưu dạng chuỗi JSON.
     */
    @Column(name = "visible_severities", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    @Nationalized
    private String visibleSeveritiesJson;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

