pipeline {
    agent any

    environment {
        JFROG_SERVER = credentials('jfrog')   // Store in Jenkins credentials
        SSH_KEY = credentials('ssh_agent')    // Store SSH key securely
        GIT_CREDENTIALS = 'git'
        REPO_URL = 'https://github.com/ArtfordU7174/greeting-app-july24-v1.git'
        STAGING_SERVER = '3.229.181.63'
        K8S_MASTER = '107.21.221.56'
    }

    tools {
        maven 'Maven'
    }

    stages {
        stage ('Checkout SCM') {
            steps {
                git branch: 'master', credentialsId: GIT_CREDENTIALS, url: REPO_URL
            }
        }

        stage ('Build') {
            steps {
                dir('webapp') {
                    sh "pwd"
                    sh "ls -lah"
                    sh "mvn package"
                }
            }
        }

        stage ('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonar') {
                    dir('webapp') {
                        sh 'mvn -U clean install sonar:sonar'
                    }
                }
            }
        }

        stage ('Artifactory Configuration') {
            steps {
                rtServer(
                    id: "jfrog",
                    url: "http://52.21.102.210:8082/artifactory",
                    credentialsId: JFROG_SERVER
                )

                rtMavenDeployer(
                    id: "MAVEN_DEPLOYER",
                    serverId: "jfrog",
                    releaseRepo: "vmtechgreetingapp-libs-release-local",
                    snapshotRepo: "vmtechgreetingapp-libs-snapshot-local"
                )

                rtMavenResolver(
                    id: "MAVEN_RESOLVER",
                    serverId: "jfrog",
                    releaseRepo: "vmtechgreetingapp-libs-release-local",
                    snapshotRepo: "vmtechgreetingapp-libs-snapshot-local"
                )
            }
        }

        
        stage ('Deploy Artifacts') {
            steps {
                rtMavenRun(
                    tool: "Maven",
                    pom: 'webapp/pom.xml',
                    goals: 'clean install',
                    deployerId: "MAVEN_DEPLOYER",
                    resolverId: "MAVEN_RESOLVER"
                )
            }
        }
        
        /*
        stage ('Publish Build Info') {
            steps {
                rtPublishBuildInfo(
                    serverId: "jfrog"
                )
            }
        }
        */ 
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
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@18.175.216.77 -C \"ansible-playbook -vvv -e build_number=${BUILD_NUMBER} push-2-dockerhub.yaml\""
                        }
                    }
                }
            }
        }

        stage('Copy Deployment & Service Definition to K8s Master') {
            steps {
                sshagent(['ssh_agent']) {
                    sh "scp -o StrictHostKeyChecking=no deploy_service.yaml ubuntu@${K8S_MASTER}:/home/ubuntu"
                }
            }
        }

        stage('Waiting for Approvals') {
            steps {
                input('Test Completed? Provide approval for production release.')
            }
        }

        stage('Deploy to Production') {
            steps {
                sshagent(['ssh_agent']) {
                    sh "ssh -o StrictHostKeyChecking=no ubuntu@35.179.152.149 -C \"kubectl apply -f deploy_service.yaml\""
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

