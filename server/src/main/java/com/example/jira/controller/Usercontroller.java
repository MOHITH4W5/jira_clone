package com.example.jira.controller;

import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.jira.model.User;
import com.example.jira.repository.UserRepository;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/users")
public class Usercontroller {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // =========================
    // SIGNUP
    // =========================
    @PostMapping("/signup")
    public User signup(@RequestBody User user) {

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole(user.getRole() == null ? "USER" : user.getRole());

        return userRepository.save(user);
    }

    // =========================
    // LOGIN
    // =========================
    @PostMapping("/login")
    public User login(@RequestBody User loginRequest) {

        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(
                loginRequest.getPassword(),
                user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        return user; // later replace with JWT token
    }

    // =========================
    // GET USER BY ID
    // =========================
    @GetMapping("/{id}")
    public User getUserById(@PathVariable String id) {

        ObjectId objectId;
        try {
            objectId = new ObjectId(id);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid user id");
        }

        return userRepository.findById(objectId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // =========================
    // EDIT PROFILE
    // =========================
    @PutMapping("/{id}")
    public User editProfile(
            @PathVariable String id,
            @RequestBody User updatedUser) {

        ObjectId objectId;
        try {
            objectId = new ObjectId(id);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid user id");
        }

        User user = userRepository.findById(objectId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(updatedUser.getName());
        user.setGroup(updatedUser.getGroup());
        user.setAvatar(updatedUser.getAvatar());

        return userRepository.save(user);
    }
}
