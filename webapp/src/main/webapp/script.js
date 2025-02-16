function displayGreeting() {
    var name = document.getElementById('name').value;
    var greetingElement = document.getElementById('greeting');
    greetingElement.textContent = 'Hello, ' + name + '! Welcome to the Mobann DevOps greeting App';
}

