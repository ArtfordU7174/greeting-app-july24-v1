pipeline {
    agent any

    environment {
        JFROG_SERVER = credentials('jfrog')  // JFrog Artifactory credentials
        SSH_KEY = credentials('ssh_agent')   // SSH key for secure access to servers
        GIT_CREDENTIALS = 'git'  // GitHub credentials
        REPO_URL = 'https://github.com/ArtfordU7174/greeting-app-july24-v1.git'
        STAGING_SERVER = '3.229.181.63'  // Staging server IP
        K8S_MASTER = '107.21.221.56'  // Kubernetes Master IP
    }

    tools {
        maven 'Maven'  // Specify Maven tool for building the project
    }

    stages {
        // Checkout the source code from GitHub
        stage ('Checkout SCM') {
            steps {
                git branch: 'master', credentialsId: GIT_CREDENTIALS, url: REPO_URL
            }
        }

        // Build the project using Maven
        stage ('Build') {
            steps {
                dir('webapp') {
                    sh "pwd"
                    sh "ls -lah"
                    sh "mvn package"
                }
            }
        }

        // Perform SonarQube analysis on the code
        stage ('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonar') {
                    dir('webapp') {
                        sh 'mvn -U clean install sonar:sonar'
                    }
                }
            }
        }

        // Set up the Artifactory configuration for Maven
        stage ('Artifactory Configuration') {
            steps {
                rtServer(
                    id: "jfrog",
                    url: "http://52.21.102.210:8082/artifactory",  // Replace with an environment variable for flexibility
                    credentialsId: JFROG_SERVER
                )

                rtMavenDeployer(
                    id: "MAVEN_DEPLOYER",
                    serverId: "jfrog",
                    releaseRepo: "dannart-libs-release-local",
                    snapshotRepo: "dannart-libs-snapshot-local"
                )

                rtMavenResolver(
                    id: "MAVEN_RESOLVER",
                    serverId: "jfrog",
                    releaseRepo: "dannart-libs-release-local",
                    snapshotRepo: "dannart-libs-snapshot-local"
                )
            }
        }

        // Deploy artifacts to Artifactory
       // stage ('Deploy Artifacts') {
        //    steps {
         //       rtMavenRun(
         //           tool: "Maven",
         //           pom: 'webapp/pom.xml',
         //           goals: 'clean install',
         //           deployerId: "MAVEN_DEPLOYER",
         //           resolverId: "MAVEN_RESOLVER"
         //       )
         //   }
        //}

       stage ('Publish build info') {
            steps {
                rtPublishBuildInfo (
                    serverId: "jfrog", 
                    credentialsId: JFROG_SERVER
                 )
             }
         }
        
        // Copy Dockerfile and playbook to the staging server and build container image
        stage('Copy Files & Build Image in Parallel') {
            parallel {
                stage('Copy Dockerfile & Playbook to Staging Server') {
                    steps {
                        sshagent(['ssh_agent']) {
                            sh "scp -o StrictHostKeyChecking=no dockerfile ubuntu@${STAGING_SERVER}:/home/ubuntu"
                            sh "scp -o StrictHostKeyChecking=no push-2-dockerhub.yaml ubuntu@${STAGING_SERVER}:/home/ubuntu"
                        }
                    }
                }
                stage('Build Container Image') {
                    steps {
                        sshagent(['ssh_agent']) {
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@${STAGING_SERVER} -C \"ansible-playbook -vvv -e build_number=${BUILD_NUMBER} push-2-dockerhub.yaml\""
                        }
                    }
                }
            }
        }

        // Copy Kubernetes deployment service definition to the K8s master
        stage('Copy Deployment & Service Definition to K8s Master') {
            steps {
                sshagent(['ssh_agent']) {
                    sh "scp -o StrictHostKeyChecking=no deploy_service.yaml ubuntu@${K8S_MASTER}:/home/ubuntu"
                }
            }
        }

        // Await approval before proceeding to production deployment
        stage('Waiting for Approvals') {
            steps {
                input('Test Completed? Provide approval for production release.')
            }
        }

        // Deploy the service to production on Kubernetes
        stage('Deploy to Production') {
            steps {
                sshagent(['ssh_agent']) {
                    sh "ssh -o StrictHostKeyChecking=no ubuntu@${K8S_MASTER} -C \"kubectl apply -f deploy_service.yaml\""
                }
            }
        }
    }

    post {
        success {
            echo 'Build and Deployment Successful!'
        }
        failure {
            echo 'Build Failed. Check logs for details.'
        }
        always {
            cleanWs()  // Cleans up workspace to avoid issues in next builds
        }
    }
}

