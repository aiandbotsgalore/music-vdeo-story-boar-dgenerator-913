import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import type { Scene } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const textModel = 'gemini-2.5-flash';
const imageModel = 'gemini-2.5-flash-image-preview'; // Nano Banana

export const transcribeAudio = async (audio: { data: string; mimeType: string }): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: textModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: audio.data,
              mimeType: audio.mimeType,
            },
          },
          {
            text: "You are an expert audio transcriptionist. Transcribe the provided audio file. Your task is to extract the lyrics and provide precise timestamps for each line. The output format must strictly follow '[mm:ss.sss] Lyric line'. For example:\n[00:01.500] The city sleeps\n[00:04.250] but my heart is awake",
          },
        ],
      },
       config: {
            systemInstruction: "You are an expert audio transcriptionist that outputs timestamped lyrics.",
        },
    });
    return response.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    const errorString = String(error);
    if (errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429")) {
        return "Transcription failed due to API quota limits. Please check your Gemini API plan and billing.";
    }
    return "Error: Could not transcribe audio. Please check the file and try again.";
  }
};

export const generateIdeaFromLyrics = async (lyrics: string): Promise<string> => {
    const prompt = `
    You are a creative director for music videos.
    Based on the following song lyrics, generate a concise and visually interesting music video concept.
    Your response should be a short, compelling paragraph (2-4 sentences) that outlines the core idea, setting, and mood.
    Do not add any preamble like "Here's an idea:". Just return the concept directly.

    Lyrics:
    ---
    ${lyrics}
    ---
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            systemInstruction: "You are an expert creative director specializing in music video concepts. You write concise, compelling ideas based on song lyrics.",
        },
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating idea from lyrics:", error);
    const errorString = String(error);
    if (errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429")) {
        return "Idea generation failed due to API quota limits. Please check your Gemini API plan and billing.";
    }
    return "Error: Could not generate an idea from the lyrics. Please try again.";
  }
};

export const enhanceText = async (textToEnhance: string, context: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: textModel,
        contents: `Given the context of "${context}", enhance the following text to be more creative, descriptive, and visually compelling for a music video scene: "${textToEnhance}"`,
        config: {
            systemInstruction: "You are an expert copywriter specializing in vivid, cinematic descriptions.",
        },
    });
    return response.text;
  } catch (error) {
    console.error("Error enhancing text:", error);
    return `Error enhancing text. Original: ${textToEnhance}`;
  }
};

interface StoryboardPayload {
    logline: string;
    narrativeArc: string;
    storyboard: Scene[];
}

export const generateStoryboardFromBrief = async (
  idea: string,
  lyrics: string,
  characterPrompt: string,
  stylePrompt: string
): Promise<StoryboardPayload> => {
  const prompt = `
    You are a creative director for music videos. Your task is to take a user's creative brief and transform it into a complete, ready-to-shoot storyboard.

    First, based on all the provided information, synthesize a compelling, high-level concept. This concept must have:
    1. A catchy **logline** (a single, compelling sentence).
    2. A brief **narrative arc** (2-3 sentences) describing how the story evolves through a typical song structure (e.g., verse, chorus, bridge), keeping the timestamps from the lyrics in mind.

    Second, using the logline and narrative arc you just created as your guide, generate a detailed, scene-by-scene storyboard.

    **User's Creative Brief:**
    - **Initial Idea:** ${idea || 'Not specified, be creative.'}
    - **Visual Style:** ${stylePrompt}
    - **Characters and Props:** ${characterPrompt || 'Not specified.'}
    - **Lyrics (Your timeline and emotional guide):**
    ${lyrics}

    **Instructions for the Storyboard:**
    - Break the video down into scenes, with each scene representing approximately a 5-second interval.
    - The final timestamp should match the end of the lyrics.
    - For each scene, provide:
      1. A concise but vivid **description** of the visuals that STRICTLY adheres to the provided **Visual Style** and the **Narrative Arc** you created.
      2. A brief, active description of key **actions** or events in the scene (e.g., 'She runs through the rain', 'The spaceship lands').
      3. A suggested **camera angle** (e.g., 'Wide Shot', 'Close-Up', 'Point of View', 'Dutch Angle') that best captures the emotion of the scene.
      4. The corresponding lyric line(s) for that interval.
      5. The song **section** ('Verse', 'Chorus', 'Bridge', 'Intro', 'Outro', 'Instrumental', or 'Other').

    It is crucial to maintain consistency in narrative, character, and style throughout all scenes. The entire output must be in the specified JSON format.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert creative director for music videos. Generate a full storyboard concept from a brief and output it in the requested JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            logline: {
              type: Type.STRING,
              description: "A single, compelling sentence that summarizes the music video's concept."
            },
            narrativeArc: {
              type: Type.STRING,
              description: "A 2-3 sentence summary of how the story evolves through the song."
            },
            storyboard: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  description: { type: Type.STRING },
                  actions: { type: Type.STRING, description: "A brief, active description of key actions or events." },
                  cameraAngle: { type: Type.STRING, description: "A suggested camera angle like 'Wide Shot' or 'Close-Up'." },
                  lyric: { type: Type.STRING },
                  section: { type: Type.STRING }
                },
                required: ["timestamp", "description", "actions", "cameraAngle", "lyric", "section"]
              }
            }
          },
          required: ["logline", "narrativeArc", "storyboard"]
        }
      },
    });

    const jsonString = response.text;
    const parsedPayload: StoryboardPayload = JSON.parse(jsonString);
    return parsedPayload;
  } catch (error) {
    console.error("Error generating storyboard:", error);
    const errorString = String(error);
    let errorMessage = "Could not generate storyboard. Please check your inputs and try again.";

    if (errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429")) {
        errorMessage = "Storyboard generation failed due to API quota limits. Please check your Gemini API plan and billing.";
    } else if (errorString.includes("SAFETY")) {
        errorMessage = "Storyboard generation blocked due to content policy. Please adjust your inputs.";
    }

    return {
      logline: "Error",
      narrativeArc: "Could not generate storyboard from brief.",
      storyboard: [{ timestamp: "Error", description: errorMessage, actions: "N/A", lyric: "N/A", section: "Error" }]
    };
  }
};


export const generateImage = async (
    scene: Scene,
    sceneIndex: number,
    storyboard: Scene[],
    stylePrompt: string,
    characterPrompt: string,
    numberOfVariants: number,
    characterReferenceImage: { data: string; mimeType: string } | null,
    styleReferenceImage: { data: string; mimeType: string } | null
): Promise<string[]> => {
    try {
        const previousScene = sceneIndex > 0 ? storyboard[sceneIndex - 1] : null;
        const nextScene = sceneIndex < storyboard.length - 1 ? storyboard[sceneIndex + 1] : null;

        const contextPrompts = [];
        if (previousScene) {
            contextPrompts.push(`- **PREVIOUS SCENE CONTEXT:** The scene immediately before this was: "${previousScene.description}". It is crucial to maintain visual continuity. The setting, character appearances, and overall atmosphere should remain consistent unless a change is explicitly mentioned in the current scene's description.`);
        }
        if (nextScene) {
            contextPrompts.push(`- **NEXT SCENE FORESHADOWING:** The scene immediately after this will be: "${nextScene.description}". Ensure the current image sets up a logical visual transition into the next scene.`);
        }

        const fullPrompt = `You are a creative AI specializing in cinematic image generation. Your goal is to produce a photorealistic frame for a music video based on the detailed brief below. The image should be visually stunning and emotionally resonant.

**Scene Brief**
- **Core Scene Context:** The core action and emotion is: "${scene.description}". This scene happens during the song's "${scene.section || 'unspecified section'}" and corresponds to the lyric: "${scene.lyric || 'no specific lyric'}". The image must capture the energy of the section and the feeling of the lyric.
- **Characters & Props:** ${characterPrompt || 'As described in the scene. Maintain consistency.'}

**Cinematic Direction**
- **Overall Style:** Embody the aesthetic of "${stylePrompt}".
- **Mood & Atmosphere:** Capture the specific mood of the scene, whether it's somber, energetic, or mysterious. Lighting is a key element in establishing this atmosphere. Consider techniques like dramatic Rembrandt lighting for high contrast, soft diffused morning light for a gentle feel, or the vibrant glow of neon signs reflecting on wet pavement for a futuristic look.
- **Color:** Use a deliberate color palette to heighten the emotional impact. For example, a cool-toned, desaturated palette can convey melancholy, while a warm, golden-hour palette can evoke nostalgia.
- **Camera Work:** The shot should be composed as if by a skilled director of photography, using the suggested angle: '${scene.cameraAngle || 'An appropriate cinematic angle'}'. Employ camera effects like a shallow depth of field to draw focus to a character's eyes, or a deep focus to capture rich detail throughout the entire scene.

${contextPrompts.length > 0 ? `**Scene Continuity (VERY IMPORTANT)**\n${contextPrompts.join('\n')}\n` : ''}

**Reference Guidance**
${styleReferenceImage ? "- A style reference image is provided. Draw inspiration from its mood, lighting, color palette, and overall aesthetic." : ''}
${characterReferenceImage ? "- A character reference image is provided. Ensure the main character's appearance, clothing, and key features strongly resemble the person in the reference image." : ''}

**Final Output**
Produce a photorealistic and cinematic image that does not contain any text, overlays, or watermarks.
`;

        const contentParts: any[] = [];
        
        if (styleReferenceImage) {
            contentParts.push({
                inlineData: {
                    data: styleReferenceImage.data,
                    mimeType: styleReferenceImage.mimeType,
                },
            });
        }
        
        if (characterReferenceImage) {
            contentParts.push({
                inlineData: {
                    data: characterReferenceImage.data,
                    mimeType: characterReferenceImage.mimeType,
                },
            });
        }
        
        contentParts.push({
            text: fullPrompt,
        });

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: imageModel,
            contents: { parts: contentParts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const candidate = response?.candidates?.[0];

        if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            const finishReason = candidate?.finishReason;
            let userFriendlyMessage = 'Generation failed. Please try again later.';

            if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'PROHIBITED_CONTENT') {
                 userFriendlyMessage = 'Image generation was blocked due to the content policy. Please try rephrasing your scene description or style.';
            }
            
            console.error(`Image generation failed. Reason: ${finishReason || 'UNKNOWN_REASON'}.`, "Full response:", JSON.stringify(response, null, 2));
            throw new Error(userFriendlyMessage);
        }

        const imageUrls: string[] = [];
        const parts = candidate.content.parts;
        for (const part of parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                imageUrls.push(`data:image/png;base64,${base64ImageBytes}`);
            }
        }

        if (imageUrls.length === 0) {
            const errorMessage = "No image data found in the successful API response.";
             console.error(errorMessage, "Full response:", JSON.stringify(response, null, 2));
            throw new Error(errorMessage);
        }
        return imageUrls;

    } catch (error) {
        console.error("Error generating image:", error);
        // Re-throw the specific error from the catch block above or a generic one
        throw error instanceof Error ? error : new Error('An unknown error occurred during image generation.');
    }
};


export const editImageWithMask = async (
    originalImage: { data: string; mimeType: string },
    maskImage: { data: string; mimeType: string },
    editPrompt: string,
    stylePrompt: string,
    characterPrompt: string,
    characterReferenceImage: { data: string; mimeType: string } | null,
    styleReferenceImage: { data: string; mimeType: string } | null,
    scene: Scene
): Promise<string[]> => {
    try {
        const fullPrompt = `You are a sophisticated AI image editor. Your task is to seamlessly modify a source image according to the user's prompt, using a provided mask to define the edit area.

**Editing Task**
- **Source Image:** The first image provided is the base for your edit.
- **Mask:** The second image is a mask. Your modifications should be confined to the white area of this mask, leaving the black area unchanged.
- **User's Edit Prompt:** Apply this change: "${editPrompt}".

**Creative Consistency**
- **Overall Style:** The edited region must blend perfectly with the existing style of the image, as described by: "${stylePrompt}".
- **Character Integrity:** If characters are present, maintain their appearance based on this description: "${characterPrompt}".
${scene.lyric ? `- **Lyrical Mood:** Remember, this scene corresponds to the lyric: "${scene.lyric}". The edit should align with this mood.` : ''}
${scene.section ? `- **Song Pacing:** This is part of the song's "${scene.section}". The edit should reflect the energy of this section.` : ''}
- **Realism:** The final result should be photorealistic and lifelike, with no visible seams or artifacts. Avoid cartoonish changes unless specifically requested.

**Reference Guidance**
${styleReferenceImage ? '- A style reference image is also provided. Use it to guide the mood, lighting, and aesthetic of the edited region.' : ''}
${characterReferenceImage ? '- A character reference image is also provided. Ensure any edited characters maintain a strong likeness to this reference.' : ''}

**Final Output**
Please output only the final, edited image without any accompanying text.
`;
        
        const contentParts: any[] = [];
        
        if (styleReferenceImage) {
            contentParts.push({ inlineData: styleReferenceImage });
        }
        if (characterReferenceImage) {
            contentParts.push({ inlineData: characterReferenceImage });
        }

        contentParts.push({ inlineData: originalImage });
        contentParts.push({ inlineData: maskImage });
        contentParts.push({ text: fullPrompt });
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: imageModel,
            contents: { parts: contentParts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const candidate = response?.candidates?.[0];

        if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            const finishReason = candidate?.finishReason;
            let userFriendlyMessage = 'Image editing failed. Please try again later.';

            if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'PROHIBITED_CONTENT') {
                 userFriendlyMessage = 'Image editing failed due to the content policy. Please try rephrasing your prompt.';
            }
            
            console.error(`Image editing failed. Reason: ${finishReason || 'UNKNOWN_REASON'}.`, "Full response:", JSON.stringify(response, null, 2));
            throw new Error(userFriendlyMessage);
        }

        const imageUrls: string[] = [];
        const parts = candidate.content.parts;
        for (const part of parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                imageUrls.push(`data:image/png;base64,${base64ImageBytes}`);
            }
        }
        
        if (imageUrls.length === 0) {
            const errorMessage = "No image data found in the successful API response after editing.";
             console.error(errorMessage, "Full response:", JSON.stringify(response, null, 2));
            throw new Error(errorMessage);
        }
        return imageUrls;

    } catch (error) {
        console.error("Error editing image:", error);
        throw error instanceof Error ? error : new Error('An unknown error occurred during image editing.');
    }
};