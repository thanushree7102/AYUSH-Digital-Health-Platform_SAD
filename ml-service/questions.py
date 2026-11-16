"""Ten Prakriti questions. Each answer is 0 = Vata-like, 1 = Pitta-like, 2 = Kapha-like."""
QUESTIONS = [
    ("body_frame", "Body frame", ["Thin, light, hard to gain weight", "Medium, muscular", "Large, heavy, gains weight easily"]),
    ("skin", "Skin", ["Dry, rough, cool", "Warm, oily, sensitive, freckles", "Smooth, thick, moist, pale"]),
    ("hair", "Hair", ["Dry, thin, brittle", "Fine, early greying / thinning", "Thick, wavy, oily"]),
    ("appetite", "Appetite", ["Irregular, variable", "Strong, gets irritable when hungry", "Steady, can skip meals easily"]),
    ("digestion", "Digestion", ["Gas, bloating, constipation", "Acidity, loose stools", "Slow, heavy after meals"]),
    ("sleep", "Sleep", ["Light, interrupted", "Moderate, wakes refreshed", "Deep, long, hard to wake"]),
    ("temperament", "Temperament", ["Anxious, enthusiastic, changeable", "Intense, focused, short-tempered", "Calm, patient, slow to anger"]),
    ("weather", "Weather dislike", ["Cold and wind", "Heat and sun", "Cold and damp"]),
    ("energy", "Energy", ["Comes in bursts, tires quickly", "Moderate, driven", "Steady, good stamina"]),
    ("speech", "Speech / movement", ["Fast, talkative, quick", "Sharp, precise, clear", "Slow, soft, deliberate"]),
]
FEATURES = [q[0] for q in QUESTIONS]
LABELS = ["Vata", "Pitta", "Kapha", "Vata-Pitta", "Pitta-Kapha", "Vata-Kapha", "Sama (Tridosha)"]
