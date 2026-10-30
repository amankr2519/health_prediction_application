import logging

from groq import Groq

from config import settings

logger = logging.getLogger("health_prediction.ai")


def generate_remarks(patient: dict) -> str:
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    client = Groq(api_key=settings.groq_api_key)
    try:
        completion_options = {}
        if settings.groq_model.startswith("openai/gpt-oss-"):
            completion_options = {
                # GPT-OSS uses part of its completion budget for reasoning.
                # Keep reasoning low and reserve tokens for the final text.
                "reasoning_effort": "low",
                "include_reasoning": False,
            }

        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a cautious health-information assistant that writes short, general "
                        "observations about blood test values for a patient records app. "
                        "Never give a diagnosis, never name a specific disease, and never say a person "
                        "'has' a condition. Use hedged language such as 'may be higher than typical'. "
                        "No units are supplied, so assume mg/dL for glucose and cholesterol and g/dL for "
                        "haemoglobin, and say this is an assumption. "
                        "Do not recommend medications, supplements, diets or treatments. "
                        "Reply in plain text, at most 3 sentences (about 60 words), mentioning glucose, "
                        "haemoglobin and cholesterol once each, in that order. "
                        "End by stating this is not a medical diagnosis and a healthcare professional "
                        "should interpret the results."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Glucose: {patient['glucose']}; haemoglobin: {patient['haemoglobin']}; "
                        f"cholesterol: {patient['cholesterol']}. Give a short observation."
                    ),
                },
            ],
            temperature=0.2,
            max_completion_tokens=512,
            **completion_options,
        )
    except Exception as exc:
        # Provider exceptions include useful status/error text, but never log the
        # request headers or API key.
        logger.exception("Groq request failed (%s)", type(exc).__name__)
        raise

    if not response.choices:
        raise RuntimeError("AI provider returned no choices")
    choice = response.choices[0]
    remarks = choice.message.content
    if not remarks:
        logger.error(
            "Groq returned no message content (finish_reason=%s, completion_tokens=%s)",
            choice.finish_reason,
            getattr(getattr(response, "usage", None), "completion_tokens", None),
        )
        raise RuntimeError("AI provider returned no message content")
    return remarks.strip()

