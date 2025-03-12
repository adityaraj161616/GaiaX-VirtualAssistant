const btn = document.querySelector('.talk');
const content = document.querySelector('.content');
const mainSection = document.querySelector('.main');
const searchResultsSection = document.querySelector('.search-results');
const resultsContent = document.getElementById('results-content');
const copyButton = document.getElementById('copy-button');
const searchResultsContainer = document.getElementById('search-results-container');
const inputDiv = document.querySelector('.input');

// API Keys
const OPENWEATHERMAP_API_KEY = "OpenWeatherMap API key"; // OpenWeatherMap API key
const NEWSAPI_API_KEY = "NewsAPI key"; // NewsAPI key
const GEMINI_API_KEY = "Gemini API key"; // Gemini API key

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
let recognitionActive = false;

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
        recognitionActive = false;
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        content.textContent = "Sorry, I couldn't understand you. Please try again.";
        recognitionActive = false;
    };

    btn.addEventListener('click', () => {
        if (currentSpeech) {
            stopSpeech();
            content.textContent = "Speech stopped.";
        } else {
            if (recognitionActive) {
                recognition.stop();
                content.textContent = "Stopped listening.";
                recognitionActive = false;
            } else {
                content.textContent = "Listening...";
                recognition.start();
                recognitionActive = true;
            }
        }
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

// Gemini API Integration
async function askGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const headers = { 'Content-Type': 'application/json' };
    const data = {
        "contents": [
            {
                "parts": [
                    { "text": prompt }
                ]
            }
        ]
    };

    try {
        const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(data) });
        const responsedata = await response.json();
        if (responsedata.candidates && responsedata.candidates.length > 0) {
            return responsedata.candidates[0].content.parts[0].text.trim();
        } else {
            return "Sorry, I couldn't generate a response.";
        }
    } catch (error) {
        console.error("Error fetching Gemini response:", error);
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
        historyList.prepend(li);
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
        "what you can do": () => {
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
        "open linkedin": () => {
            window.open("https://in.linkedin.com", "_blank");
            speak("Opening Linkedin...");
        },
        "open instagram": () => {
            window.open("https://www.instagram.com", "_blank");
            speak("Opening Insagram...");
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
            performSearch(query);
        },
        "stop": () => {
            stopSpeech();
        },
        "write a note": async () => {
            const note = await askGemini("Write a note about: " + message.replace("write a note", "").trim());
            writeNoteToFile(note);
            speak("Note written and saved to your computer.");
        },
        "ask": async () => {
            const question = message.replace("ask", "").trim();
            const response = await askGemini(question);
            speak(response);
        }
    };

    for (const [keyword, action] of Object.entries(commands)) {
        if (message.includes(keyword)) {
            action();
            return;
        }
    }

    // Fallback to Gemini for general queries
    speak("Let me think about that...");
    askGemini(message).then(response => {
        speak(response);
        displaySearchResults(response);
    });
}

// Perform search and display results
async function performSearch(query) {
    speak(`Searching for ${query}...`);
    const response = await askGemini(query);
    displaySearchResults(response);
}

// Display search results
function displaySearchResults(results) {
    const resultBox = document.createElement('div');
    resultBox.className = 'search-result-box fade-in';
    resultBox.textContent = results.split('\n')[0]; // Show only the first paragraph
    resultBox.addEventListener('click', () => {
        resultsContent.innerHTML = `<div class="result-box">${results}</div>`;
        mainSection.classList.add('shift-left');
        searchResultsSection.classList.add('open');
    });
    searchResultsContainer.innerHTML = ''; // Clear previous results
    searchResultsContainer.appendChild(resultBox);
}

// Copy search results to clipboard
copyButton.addEventListener('click', () => {
    const text = resultsContent.textContent;
    navigator.clipboard.writeText(text).then(() => {
        speak("Results copied to clipboard.");
    }).catch(err => {
        console.error("Error copying text: ", err);
        speak("Failed to copy results.");
    });
});

// Load history when the page loads
window.addEventListener("load", () => {
    updateHistoryUI();
});

// Handle click on search result box to fade out and transition back
searchResultsSection.addEventListener('click', () => {
    searchResultsSection.classList.add('fade-out');
    setTimeout(() => {
        searchResultsSection.classList.remove('open', 'fade-out');
        mainSection.classList.remove('shift-left');
        resultsContent.innerHTML = '';
    }, 500); // Match the duration of the fade-out animation
});

// Stop speech and clear search results when clicking on the input div
inputDiv.addEventListener('click', () => {
    stopSpeech();
    searchResultsContainer.innerHTML = ''; // Clear search results
    searchResultsSection.classList.remove('open');
    mainSection.classList.remove('shift-left');
});
