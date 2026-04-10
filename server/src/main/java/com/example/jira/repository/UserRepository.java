package com.example.jira.repository;

import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.jira.model.User;

public interface UserRepository extends MongoRepository<User, ObjectId> {

    Optional<User> findByEmail(String email);
    Optional<User> findByEmailVerificationToken(String emailVerificationToken);
    Optional<User> findByPendingEmail(String pendingEmail);
    Optional<User> findByPasswordResetToken(String passwordResetToken);

    List<User> findByIdIn(List<ObjectId> ids);

}
