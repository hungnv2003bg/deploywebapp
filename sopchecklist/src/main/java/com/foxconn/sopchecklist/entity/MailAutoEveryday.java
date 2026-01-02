package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mail_auto_everyday")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class MailAutoEveryday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type", nullable = false, length = 50)
    private String type;

    @Column(name = "time_send", nullable = false, length = 5)
    private String timeSend; // Format: "HH:mm" (ví dụ: "08:30", "13:30")

    @Column(name = "status", nullable = false)
    private Boolean status = true; // true = enabled, false = disabled

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

