package com.foxconn.sopchecklist.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;

@Service
public class NetworkConnectionFileStorageService {

    private final Path rootLocation;

    // No FTP configuration needed - using local storage only

    public NetworkConnectionFileStorageService(@Value("${file.upload-dir:uploads}") String uploadDir) throws IOException {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public String storeForNetworkConnection(MultipartFile file, String preferredFolderName) throws IOException {
        return storeInFolder(file, preferredFolderName, "network_connection");
    }

    public String storeForNetworkConnectionProblem(MultipartFile file, String preferredFolderName) throws IOException {
        return storeInFolder(file, preferredFolderName, "network_connection_problem");
    }

    public void deleteForNetworkConnectionByUrl(String url) throws IOException {
        deleteByUrl(url, "network_connection");
    }

    public void deleteForNetworkConnectionProblemByUrl(String url) throws IOException {
        deleteByUrl(url, "network_connection_problem");
    }

    private String storeInFolder(MultipartFile file, String preferredFolderName, String localRootDir) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IOException("Empty file");
        }

        String originalFilename = file.getOriginalFilename();
        String original = StringUtils.cleanPath(originalFilename != null ? originalFilename : "file");

        String ext = "";
        String base = original;
        int dot = original.lastIndexOf('.');
        if (dot >= 0) {
            ext = original.substring(dot);
            base = original.substring(0, dot);
        }

        String safeFolder = sanitizeFolderName(preferredFolderName);
        if (safeFolder == null || safeFolder.isEmpty()) {
            safeFolder = LocalDate.now().toString();
        }

        String sanitizedBase = toAsciiContinuous(base);
        if (sanitizedBase.isEmpty()) sanitizedBase = "file";
        String filename = sanitizedBase + ext.toLowerCase();

        // Save to local storage
        Path targetDir = this.rootLocation.resolve(localRootDir).resolve(safeFolder);
        Files.createDirectories(targetDir);

        Path target = targetDir.resolve(filename);
        if (!target.normalize().startsWith(this.rootLocation)) {
            throw new IOException("Invalid path");
        }
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        return "/files/" + safeFolder + "/" + filename;
    }

    private void deleteByUrl(String url, String localRootDir) throws IOException {
        if (url == null || !url.startsWith("/files/")) return;
        String relative = url.substring("/files/".length());
        
        // Delete from local storage
        Path localPath = this.rootLocation.resolve(localRootDir).resolve(relative).normalize();
        if (localPath.startsWith(this.rootLocation)) {
            try { 
                Files.deleteIfExists(localPath); 
            } catch (Exception ignored) {}
        }
    }

    // FTP methods removed - using local storage only

    private String sanitizeFolderName(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return "";
        String cleaned = toAsciiContinuous(trimmed);
        cleaned = cleaned.replaceAll("^[._-]+|[._-]+$", "");
        if (cleaned.isEmpty()) return "";
        return cleaned.length() > 100 ? cleaned.substring(0, 100) : cleaned;
    }

    private String toAsciiContinuous(String input) {
        if (input == null || input.trim().isEmpty()) {
            return "";
        }

        String cleaned = input.trim()
                .replaceAll("[<>:\"/\\\\|?*]", "")
                .replaceAll("\\s+", "_")
                .replaceAll("_{2,}", "_")
                .replaceAll("^_+|_+$", "");

        if (cleaned.isEmpty()) {
            return "file";
        }
        return cleaned;
    }
}

