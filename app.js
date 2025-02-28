const btn = document.querySelector('.talk');
const content = document.querySelector('.content');

// API Keys
const OPENWEATHERMAP_API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
const NEWSAPI_API_KEY = "Your NewsAPI key";
const OPENAI_API_KEY = "Your OpenAI API key";

// Speech Synthesis
let currentSpeech = null; // Track the current speech

function speak(text) {
    if (currentSpeech) {
        window.speechSynthesis.cancel(); // Stop any ongoing speech
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.volume = 1;
    utterance.pitch = 0.8; // Lower pitch for a robotic voice

    // Set a specific voice (if available)
    const voices = window.speechSynthesis.getVoices();
    const roboticVoice = voices.find(voice => voice.name.includes("Google UK English Male") || voice.name.includes("Microsoft David"));
    if (roboticVoice) utterance.voice = roboticVoice;

    currentSpeech = utterance;
    window.speechSynthesis.speak(utterance);
}

// Stop Speech
function stopSpeech() {
    if (currentSpeech) {
        window.speechSynthesis.cancel();
        currentSpeech = null;
        speak("Speech stopped.");
    }
}

// Greet the user based on time
function wishMe() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) speak("Good Morning Boss...");
    else if (hour >= 12 && hour < 17) speak("Good Afternoon Master...");
    else speak("Good Evening Sir...");
}

// Initialize GaiaX
window.addEventListener('load', () => {
    speak("Initializing GaiaX...");
    wishMe();
});

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    content.textContent = "Your browser does not support speech recognition. Please use Chrome or Edge.";
} else {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        content.textContent = transcript;
        takeCommand(transcript.toLowerCase());
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        content.textContent = "Sorry, I couldn't understand you. Please try again.";
    };

    btn.addEventListener('click', () => {
        content.textContent = "Listening...";
        recognition.start();
    });
}

// Fetch Weather Data using OpenWeatherMap API
async function getWeather(city) {
    const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`;
    try {
        // Step 1: Get latitude and longitude for the city
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.length === 0) {
            speak("Sorry, I couldn't find the city. Please try again.");
            return;
        }
        const { lat, lon } = geocodeData[0];

        // Step 2: Fetch weather data using lat and lon
        const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        if (weatherData.current) {
            const temp = weatherData.current.temp;
            const weather = weatherData.current.weather[0].description;
            speak(`The weather in ${city} is ${weather} with a temperature of ${temp} degrees Celsius.`);
        } else {
            speak("Sorry, I couldn't fetch the weather data. Please try again.");
        }
    } catch (error) {
        console.error("Error fetching weather data:", error);
        speak("Sorry, I couldn't fetch the weather data. Please check your internet connection.");
    }
}

// Fetch News Data using NewsAPI
async function getNews() {
    const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWSAPI_API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === "ok") {
            const headlines = data.articles.slice(0, 3).map(article => article.title).join(". ");
            speak("Here are the top news headlines: " + headlines);
        } else {
            speak("Sorry, I couldn't fetch the news. Please try again.");
        }
    } catch (error) {
        console.error("Error fetching news data:", error);
        speak("Sorry, I couldn't fetch the news. Please check your internet connection.");
    }
}

// OpenAI Integration
async function askOpenAI(prompt) {
    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
    };
    const body = JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150
    });

    try {
        const response = await fetch(url, { method: "POST", headers, body });
        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content.trim();
        } else {
            return "Sorry, I couldn't generate a response.";
        }
    } catch (error) {
        console.error("Error fetching OpenAI response:", error);
        return "Sorry, I couldn't connect to the AI service.";
    }
}

// Write Note to a File
function writeNoteToFile(note) {
    const blob = new Blob([note], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "note.txt";
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize History
let history = JSON.parse(localStorage.getItem("history")) || [];

// Function to add an item to history
function addToHistory(item) {
    history.push(item);
    localStorage.setItem("history", JSON.stringify(history));
    updateHistoryUI();
}

// Function to update the history UI
function updateHistoryUI() {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = ""; // Clear the list
    history.forEach((item, index) => {
        const li = document.createElement("li");
        li.textContent = item;
        li.addEventListener("click", () => {
            // Handle click on history item (e.g., reload the chat)
            alert(`You clicked: ${item}`);
        });
        historyList.appendChild(li);
    });
}

// Toggle Sidebar
const sidebar = document.getElementById("sidebar");
const swipeButton = document.getElementById("swipe-button");

swipeButton.addEventListener("click", () => {
    sidebar.classList.toggle("open");
});

// Command Handling
function takeCommand(message) {
    addToHistory(message); // Save the command to history

    const commands = {
        "hey": () => speak("Hello Sir, How May I Help You?"),
        "hello": () => speak("Hello Sir, How May I Help You?"),
        "what can you do": () => {
            const abilities = [
                "I can open Google for you.",
                "I can open YouTube for you.",
                "I can open Facebook for you.",
                "I can tell you the current time.",
                "I can tell you today's date.",
                "I can fetch the weather for any city.",
                "I can provide you with the latest news.",
                "I can search the web for you.",
                "I can look up information on Wikipedia.",
                "I can write notes for you.",
                "I can answer your questions using AI.",
                "Just ask me anything!"
            ];
            speak("Here's what I can do: " + abilities.join(" "));
        },
        "open google": () => {
            window.open("https://google.com", "_blank");
            speak("Opening Google...");
        },
        "open youtube": () => {
            window.open("https://youtube.com", "_blank");
            speak("Opening Youtube...");
        },
        "open facebook": () => {
            window.open("https://facebook.com", "_blank");
            speak("Opening Facebook...");
        },
        "time": () => {
            const time = new Date().toLocaleString(undefined, { hour: "numeric", minute: "numeric" });
            speak("The current time is " + time);
        },
        "date": () => {
            const date = new Date().toLocaleString(undefined, { month: "short", day: "numeric" });
            speak("Today's date is " + date);
        },
        "weather": () => {
            const city = message.replace("weather", "").trim();
            if (city) {
                speak(`Fetching weather for ${city}...`);
                getWeather(city);
            } else {
                speak("Please specify a city. For example, say 'weather in New York'.");
            }
        },
        "news": () => {
            speak("Fetching the latest news...");
            getNews();
        },
        "wikipedia": () => {
            const query = message.replace("wikipedia", "").trim();
            window.open(`https://en.wikipedia.org/wiki/${query}`, "_blank");
            speak("Searching Wikipedia for " + query);
        },
        "search": () => {
            const query = message.replace("search", "").trim();
            window.open(`https://www.google.com/search?q=${query.replace(" ", "+")}`, "_blank");
            speak("Searching the web for " + query);
        },
        "stop": () => {
            stopSpeech();
        },
        "write a note": async () => {
            const note = await askOpenAI("Write a note about: " + message.replace("write a note", "").trim());
            writeNoteToFile(note);
            speak("Note written and saved to your computer.");
        },
        "ask": async () => {
            const question = message.replace("ask", "").trim();
            const response = await askOpenAI(question);
            speak(response);
        }
    };

    for (const [keyword, action] of Object.entries(commands)) {
        if (message.includes(keyword)) {
            action();
            return;
        }
    }

    // Fallback to OpenAI for general queries
    speak("Let me think about that...");
    askOpenAI(message).then(response => speak(response));
}

// Load history when the page loads
window.addEventListener("load", () => {
    updateHistoryUI();
});