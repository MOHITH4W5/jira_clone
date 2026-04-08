package com.example.jira.config;

import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class MongoConfig {

    @Bean
    public MongoClient mongoClient() {
        return MongoClients.create(resolveMongoUri());
    }

    @Bean
    public MongoTemplate mongoTemplate(MongoClient mongoClient) {
        String database = new ConnectionString(resolveMongoUri()).getDatabase();
        if (database == null || database.isBlank()) {
            database = "jira";
        }
        return new MongoTemplate(mongoClient, database);
    }

    private String resolveMongoUri() {
        String uri =
                firstNonBlank(
                        System.getenv("SPRING_DATA_MONGODB_URI"),
                        System.getenv("SPRING_MONGODB_URI"),
                        System.getProperty("spring.data.mongodb.uri"),
                        System.getProperty("spring.mongodb.uri"));

        if (uri == null || uri.isBlank()) {
            throw new IllegalStateException(
                    "MongoDB URI is missing. Set SPRING_DATA_MONGODB_URI in the environment.");
        }
        return uri;
    }

    private String firstNonBlank(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate;
            }
        }
        return null;
    }
}
