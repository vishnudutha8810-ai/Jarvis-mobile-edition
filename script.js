/* =====================================================
   JARVIS MOBILE EDITION
   EPISODE 5 — MEMORY + THE EYES
   MASTER SCRIPT
   ===================================================== */


/* =====================================================
   CLOUDFLARE WORKER
   ===================================================== */

const WORKER_URL =
    "https://jarvis-api.vishnudutha8810.workers.dev";


/* =====================================================
   ELEMENTS
   ===================================================== */

const promptBox =
    document.getElementById("prompt");

const replyBox =
    document.getElementById("reply");

const brainStatus =
    document.getElementById("brainStatus");

const voiceStatus =
    document.getElementById("voiceStatus");

const micButton =
    document.getElementById("micButton");

const sendButton =
    document.getElementById("sendButton");

const clearButton =
    document.getElementById("clear-btn");

const cameraButton =
    document.getElementById("cam-btn");

const imageInput =
    document.getElementById("img-input");


/* =====================================================
   MEMORY
   ===================================================== */

const MEMORY_KEY =
    "jarvis_memory";

let MEMORY = [];

try {

    MEMORY =
        JSON.parse(
            localStorage.getItem(MEMORY_KEY)
        ) || [];

} catch (error) {

    MEMORY = [];

}


/* =====================================================
   SAVE MEMORY
   ===================================================== */

function saveMemory() {

    try {

        localStorage.setItem(
            MEMORY_KEY,
            JSON.stringify(MEMORY)
        );

    } catch (error) {

        console.error(
            "Memory save error:",
            error
        );

    }

}


/* =====================================================
   ADD MEMORY
   ===================================================== */

function addMemory(role, text) {

    MEMORY.push({
        role: role,
        text: text,
        time: Date.now()
    });

    /*
       Keep memory lightweight.
       Latest 30 messages only.
    */

    if (MEMORY.length > 30) {

        MEMORY =
            MEMORY.slice(-30);

    }

    saveMemory();

}


/* =====================================================
   BUILD MEMORY CONTEXT
   ===================================================== */

function getMemoryContext() {

    if (!MEMORY.length) {

        return "";

    }

    return MEMORY
        .map(item => {

            return (
                item.role.toUpperCase() +
                ": " +
                item.text
            );

        })
        .join("\n");

}


/* =====================================================
   CLEAR MEMORY
   ===================================================== */

if (clearButton) {

    clearButton.onclick =
        function () {

            const confirmed =
                confirm(
                    "Clear Jarvis memory?"
                );

            if (!confirmed) {

                return;

            }

            MEMORY = [];

            localStorage.removeItem(
                MEMORY_KEY
            );

            replyBox.textContent =
                "Memory cleared successfully.";

        };

}


/* =====================================================
   PROCESSING STATE
   ===================================================== */

let isProcessing = false;


/* =====================================================
   VOICE STATE
   ===================================================== */

let availableVoices = [];

let selectedJarvisVoice = null;


/* =====================================================
   LOAD VOICES
   ===================================================== */

function loadVoices() {

    if (
        !("speechSynthesis" in window)
    ) {

        return;

    }

    availableVoices =
        window.speechSynthesis
            .getVoices();

    selectedJarvisVoice =
        findBestJarvisVoice();

}


/* =====================================================
   FIND BEST JARVIS VOICE
   ===================================================== */

function findBestJarvisVoice() {

    if (!availableVoices.length) {

        return null;

    }

    const preferredNames = [

        "Google UK English Male",
        "Google US English",
        "Microsoft George",
        "Microsoft Ryan Online",
        "Microsoft Guy Online",
        "Microsoft Daniel",
        "Daniel",
        "Alex",
        "Arthur",
        "James"

    ];


    for (
        const preferredName
        of preferredNames
    ) {

        const voice =
            availableVoices.find(
                voice => {

                    return voice.name
                        .toLowerCase()
                        .includes(
                            preferredName
                                .toLowerCase()
                        );

                }
            );

        if (voice) {

            return voice;

        }

    }


    return (
        availableVoices.find(
            voice =>
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
        ) || null
    );

}


/* =====================================================
   INITIALIZE VOICES
   ===================================================== */

loadVoices();


if (
    "speechSynthesis" in window
) {

    speechSynthesis.onvoiceschanged =
        function () {

            loadVoices();

        };

}


/* =====================================================
   CLEAN TEXT FOR SPEECH
   ===================================================== */

function cleanForSpeech(text) {

    return text
        .replace(
            /\*\*(.*?)\*\*/g,
            "$1"
        )
        .replace(
            /\*(.*?)\*/g,
            "$1"
        )
        .replace(
            /`([^`]*)`/g,
            "$1"
        )
        .replace(
            /---+/g,
            ". "
        )
        .replace(
            /#+\s?/g,
            ""
        )
        .trim();

}


/* =====================================================
   SPEAK JARVIS
   ===================================================== */

function speakJarvis(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        voiceStatus.textContent =
            "NOT SUPPORTED";

        return;

    }

    if (!text) {

        return;

    }

    speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            cleanForSpeech(text)
        );


    utterance.rate =
        0.94;

    utterance.pitch =
        0.90;

    utterance.volume =
        1.0;


    if (!selectedJarvisVoice) {

        selectedJarvisVoice =
            findBestJarvisVoice();

    }


    if (selectedJarvisVoice) {

        utterance.voice =
            selectedJarvisVoice;

        utterance.lang =
            selectedJarvisVoice.lang;

    } else {

        utterance.lang =
            "en-GB";

    }


    utterance.onstart =
        function () {

            voiceStatus.textContent =
                "SPEAKING";

        };


    utterance.onend =
        function () {

            voiceStatus.textContent =
                "READY";

        };


    utterance.onerror =
        function () {

            voiceStatus.textContent =
                "READY";

        };


    speechSynthesis.speak(
        utterance
    );

}


/* =====================================================
   ASK JARVIS
   ===================================================== */

async function askJarvis() {

    if (isProcessing) {

        return;

    }


    const userPrompt =
        promptBox.value.trim();


    if (!userPrompt) {

        replyBox.textContent =
            "Please enter a message.";

        return;

    }


    isProcessing =
        true;


    sendButton.disabled =
        true;

    sendButton.textContent =
        "THINKING...";


    brainStatus.textContent =
        "THINKING";

    brainStatus.className =
        "thinking";


    replyBox.textContent =
        "Jarvis is thinking...";


    /*
       Save user message
       */

    addMemory(
        "user",
        userPrompt
    );


    try {

        /*
           Build memory context
           */

        const memoryContext =
            getMemoryContext();


        /*
           Send to Worker
           */

        const response =
            await fetch(
                WORKER_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            prompt:
                                userPrompt,

                            memory:
                                memoryContext

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Jarvis request failed."
            );

        }


        const jarvisReply =
            data.reply ||
            "Jarvis received no response.";


        /*
           Save Jarvis response
           */

        addMemory(
            "assistant",
            jarvisReply
        );


        /*
           Display
           */

        replyBox.textContent =
            jarvisReply;


        brainStatus.textContent =
            "ONLINE";

        brainStatus.className =
            "online";


        /*
           Speak
           */

        speakJarvis(
            jarvisReply
        );


        /*
           Clear input
           */

        promptBox.value =
            "";


    }
    catch (error) {

        brainStatus.textContent =
            "ERROR";


        replyBox.textContent =
            "Connection error:\n\n" +
            error.message;

    }
    finally {

        isProcessing =
            false;


        sendButton.disabled =
            false;

        sendButton.textContent =
            "SEND";

    }

}


/* =====================================================
   CAMERA / VISION
   ===================================================== */

if (cameraButton && imageInput) {

    cameraButton.onclick =
        function () {

            imageInput.click();

        };

}


/* =====================================================
   IMAGE SELECTED
   ===================================================== */

if (imageInput) {

    imageInput.addEventListener(
        "change",
        async function () {

            const file =
                imageInput.files[0];


            if (!file) {

                return;

            }


            /*
               For this step we prepare
               the image locally.
            */

            replyBox.textContent =
                "Image selected. Preparing vision analysis...";


            try {

                const base64 =
                    await fileToBase64(file);


                /*
                   Store temporary image
                   for the next vision step.
                */

                window.jarvisVisionImage = {

                    name:
                        file.name,

                    type:
                        file.type,

                    base64:
                        base64.split(",")[1]

                };


                replyBox.textContent =
                    "Image ready for Jarvis Vision.";

                /*
                   Actual Gemini Vision
                   request will be connected
                   through the Worker in the
                   next vision integration step.
                */

            }
            catch (error) {

                replyBox.textContent =
                    "Image processing error:\n\n" +
                    error.message;

            }


            /*
               Allow selecting same image again.
            */

            imageInput.value =
                "";

        }
    );

}


/* =====================================================
   FILE → BASE64
   ===================================================== */

function fileToBase64(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    resolve(
                        reader.result
                    );

                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Could not read image."
                        )
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
   
