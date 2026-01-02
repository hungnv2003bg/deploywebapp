package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "personal_notes",
       uniqueConstraints = @UniqueConstraint(name = "uk_personal_notes_user_date",
               columnNames = {"user_id", "note_date"}))
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class PersonalNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"roles", "passwordHash", "groups"})
    private Users user;

    @Column(name = "note_date", nullable = false)
    private LocalDate noteDate;

    @Nationalized
    @Column(name = "content", nullable = false, length = 2000, columnDefinition = "NVARCHAR(2000)")
    private String content;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "public_visible")
    private Boolean publicVisible = false;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

