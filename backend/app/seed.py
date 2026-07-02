"""
StudyMaster Database Seed Script
Populates the database with initial data: users, subjects, topics, concepts, and profiles.
"""
import asyncio
import sys
import os
from datetime import datetime

# Ensure we can import from the backend directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select, func
from app.database import engine, async_session, init_db
from app.models.user import User
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.concept import Concept
from app.models.profile import StudentProfile
from app.services.auth_service import hash_password


# ── SEED DATA ──────────────────────────────────────────────────────────────────

USERS = [
    {"username": "Charlie", "password": "123", "role": "student"},
    {"username": "blessing", "password": "123", "role": "student"},
]

SUBJECTS = [
    {
        "name": "Biology",
        "description": "Study of living organisms, their structure, function, growth, evolution, and ecology. Covers UTME Biology syllabus including cell biology, genetics, ecology, and human physiology.",
        "icon": "🧬",
        "color": "#22C55E",
    },
    {
        "name": "Chemistry",
        "description": "Study of matter, its properties, composition, structure, and the changes it undergoes. Covers UTME Chemistry syllabus including organic, inorganic, and physical chemistry.",
        "icon": "⚗️",
        "color": "#8B5CF6",
    },
    {
        "name": "Physics",
        "description": "Study of matter, energy, and their interactions. Covers UTME Physics syllabus including mechanics, waves, electricity, magnetism, and modern physics.",
        "icon": "⚛️",
        "color": "#3B82F6",
    },
]

CELL_CONTENT = """# Cell Structure and Organelles
Cells are the basic functional and structural units of all living organisms. While cells vary greatly in size and shape, they share certain common structures called organelles, which are specialized parts that perform specific functions.

## Key Organelles:
* **Nucleus:** The control center of the cell. It contains DNA (genetic material) and coordinates cell activities like growth, metabolism, and reproduction.
* **Mitochondria:** The "powerhouses" of the cell. They generate most of the cell's supply of adenosine triphosphate (ATP) through cellular respiration.
* **Ribosomes:** The sites of protein synthesis. They can be found floating freely in the cytoplasm or attached to the rough endoplasmic reticulum.
* **Endoplasmic Reticulum (ER):** A network of membranous tubules and sacs. Rough ER (with ribosomes) is involved in protein synthesis and transport, while Smooth ER is involved in lipid synthesis and detoxification.
* **Golgi Apparatus:** Modifies, sorts, and packages proteins and other materials from the ER for storage or secretion.
* **Lysosomes:** Contain digestive enzymes to break down waste materials and cellular debris.
* **Cell Membrane:** A selectively permeable barrier that surrounds the cell, controlling the movement of substances in and out.
"""

CELL_QUIZ = {
    "questions": [
        {
            "id": 1,
            "question": "Which organelle is considered the powerhouse of the cell?",
            "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi Apparatus"],
            "correctAnswer": 1
        },
        {
            "id": 2,
            "question": "Where does protein synthesis primarily occur?",
            "options": ["Lysosomes", "Smooth ER", "Ribosomes", "Cell Membrane"],
            "correctAnswer": 2
        },
        {
            "id": 3,
            "question": "What is the function of the Golgi Apparatus?",
            "options": ["Energy production", "Digest waste", "Sort and package proteins", "Synthesize lipids"],
            "correctAnswer": 2
        }
    ]
}

BIOLOGY_TOPICS = [
    {
        "name": "WAEC/UTME Biology Syllabus",
        "description": "Complete biology curriculum divided into core thematic concepts.",
        "concepts": [
            {
                "name": "Foundations of Biology",
                "description": "Recognising Living Things, Classification of Living Things, Organisation of Life, The Cell, The Cell and Its Environment, Some Properties and Functions of the Cell",
                "difficulty": 2, "importance": 5, "utme_weight": 3.0, "time": 45,
                "content": CELL_CONTENT, "quiz_data": CELL_QUIZ
            },
            {
                "name": "Nutrition & Feeding",
                "description": "Plant Nutrition, Animal Nutrition, Modes of Nutrition, Feeding Mechanisms in Holozoic Organisms, Digestive System",
                "difficulty": 2, "importance": 4, "utme_weight": 3.0, "time": 40
            },
            {
                "name": "Support & Body Systems (Physiology)",
                "description": "Supporting Tissues and Systems, Transport System, Respiratory System, Excretory System, Regulation of Internal Environment (Homeostasis), Hormonal Co-ordination, Nervous Co-ordination, Sense Organs",
                "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 50
            },
            {
                "name": "Reproduction & Development",
                "description": "Reproduction in Unicellular Organisms and Invertebrates, Reproductive Systems in Vertebrates, Reproductive Systems in Plants, Pollination in Plants, Reproductive Behaviours (Courtship), Reproductive System and Reproduction in Humans, Development of New Seeds, Fruits",
                "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 50
            },
            {
                "name": "Genetics & Evolution",
                "description": "Variation in Population, Biology of Heredity, Evolution",
                "difficulty": 4, "importance": 5, "utme_weight": 4.5, "time": 45
            },
            {
                "name": "Classification of Plants",
                "description": "Classification of Plants",
                "difficulty": 3, "importance": 3, "utme_weight": 2.5, "time": 30
            },
            {
                "name": "Ecology & Ecosystems",
                "description": "Basic Ecological Concepts, Functioning Ecosystem – Autotrophy and Heterotrophy, Functioning Ecosystem – Food Chains/Webs/Trophic Levels, Energy Transformation in Nature, Nutrient Cycling in Nature, Ecology of Population, Balance in Nature",
                "difficulty": 3, "importance": 4, "utme_weight": 3.5, "time": 45
            },
            {
                "name": "Habitats",
                "description": "Aquatic Habitat – Marine, Estuarine, Freshwater; Terrestrial Habitat – Marsh, Forest, Grassland, Arid Lands",
                "difficulty": 2, "importance": 3, "utme_weight": 2.5, "time": 35
            },
            {
                "name": "Ecological Management & Conservation",
                "description": "Association, Tolerance, Adaptation, Pollution, Conservation of Natural Resources",
                "difficulty": 2, "importance": 4, "utme_weight": 3.0, "time": 35
            },
            {
                "name": "Microorganisms & Health",
                "description": "Micro-organisms Around Us, Micro-organisms in Action, Towards Better Health",
                "difficulty": 2, "importance": 4, "utme_weight": 3.0, "time": 35
            },
            {
                "name": "Biology & Agriculture",
                "description": "Relevance of Biology to Agriculture, Pests and Diseases of Crops",
                "difficulty": 2, "importance": 3, "utme_weight": 2.5, "time": 30
            }
        ]
    }
]

CHEMISTRY_TOPICS = [
    {
        "name": "Separation Techniques",
        "description": "Methods of separating mixtures into their components",
        "concepts": [
            {"name": "Filtration and Evaporation", "description": "Separating insoluble solids from liquids and obtaining dissolved solids", "difficulty": 1, "importance": 4, "utme_weight": 2.0, "time": 15},
            {"name": "Distillation", "description": "Simple and fractional distillation — principles and applications", "difficulty": 2, "importance": 4, "utme_weight": 2.5, "time": 25},
            {"name": "Chromatography", "description": "Paper chromatography, column chromatography, Rf values", "difficulty": 2, "importance": 4, "utme_weight": 2.5, "time": 20},
        ],
    },
    {
        "name": "Atomic Structure",
        "description": "Structure of the atom and electronic configuration",
        "concepts": [
            {"name": "Sub-atomic Particles", "description": "Protons, neutrons, electrons — properties, atomic number, mass number, isotopes", "difficulty": 2, "importance": 5, "utme_weight": 3.5, "time": 25},
            {"name": "Electronic Configuration", "description": "Energy levels, orbitals, filling order, noble gas notation", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 35},
            {"name": "Atomic Models", "description": "Dalton, Thomson, Rutherford, Bohr models and their contributions", "difficulty": 2, "importance": 3, "utme_weight": 2.0, "time": 20},
        ],
    },
    {
        "name": "Chemical Bonding",
        "description": "Types of bonds between atoms and their properties",
        "concepts": [
            {"name": "Ionic Bonding", "description": "Electron transfer, formation of ions, properties of ionic compounds", "difficulty": 2, "importance": 5, "utme_weight": 3.5, "time": 25},
            {"name": "Covalent Bonding", "description": "Electron sharing, single/double/triple bonds, dative bonds, properties", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 30},
            {"name": "Metallic Bonding", "description": "Sea of electrons model, properties of metals", "difficulty": 2, "importance": 4, "utme_weight": 2.5, "time": 20},
            {"name": "Intermolecular Forces", "description": "Van der Waals, hydrogen bonding, and their effects on physical properties", "difficulty": 3, "importance": 4, "utme_weight": 3.0, "time": 25},
        ],
    },
    {
        "name": "Stoichiometry and Chemical Equations",
        "description": "Quantitative relationships in chemical reactions",
        "concepts": [
            {"name": "Mole Concept", "description": "Avogadro's number, molar mass, molar volume, mole calculations", "difficulty": 3, "importance": 5, "utme_weight": 5.0, "time": 45},
            {"name": "Balancing Chemical Equations", "description": "Law of conservation of mass, balancing equations, state symbols", "difficulty": 2, "importance": 5, "utme_weight": 3.5, "time": 25},
            {"name": "Empirical and Molecular Formulae", "description": "Calculating empirical and molecular formulae from percentage composition", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 35},
        ],
    },
    {
        "name": "States of Matter and Gas Laws",
        "description": "Properties of solids, liquids, gases and gas behaviour",
        "concepts": [
            {"name": "Kinetic Molecular Theory", "description": "Assumptions, explaining properties of states of matter", "difficulty": 2, "importance": 4, "utme_weight": 2.5, "time": 20},
            {"name": "Gas Laws", "description": "Boyle's, Charles', Dalton's, Graham's, and combined gas law — calculations", "difficulty": 3, "importance": 5, "utme_weight": 4.5, "time": 40},
            {"name": "Ideal Gas Equation", "description": "PV=nRT, standard temperature and pressure, gas density calculations", "difficulty": 3, "importance": 5, "utme_weight": 3.5, "time": 30},
        ],
    },
    {
        "name": "Acids, Bases and Salts",
        "description": "Properties and reactions of acids, bases, and salts",
        "concepts": [
            {"name": "Acids and Bases", "description": "Arrhenius, Brønsted-Lowry definitions, strong vs weak, pH scale", "difficulty": 2, "importance": 5, "utme_weight": 3.5, "time": 25},
            {"name": "Neutralization and Salt Formation", "description": "Types of salts, preparation methods, solubility rules", "difficulty": 2, "importance": 5, "utme_weight": 3.0, "time": 25},
            {"name": "Acid-Base Titration", "description": "Standard solution, indicators, end-point, titre value calculations", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 35},
        ],
    },
    {
        "name": "Electrochemistry",
        "description": "Chemical effects of electric current and electrochemical cells",
        "concepts": [
            {"name": "Electrolysis", "description": "Electrolytes, electrodes, Faraday's laws, applications of electrolysis", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 40},
            {"name": "Electrochemical Cells", "description": "Galvanic cells, standard electrode potentials, EMF calculations", "difficulty": 4, "importance": 4, "utme_weight": 3.5, "time": 35},
        ],
    },
    {
        "name": "Rates of Reaction and Equilibrium",
        "description": "Factors affecting reaction rates and chemical equilibrium",
        "concepts": [
            {"name": "Reaction Rates", "description": "Collision theory, factors affecting rate (temperature, concentration, catalyst, surface area)", "difficulty": 3, "importance": 5, "utme_weight": 3.5, "time": 30},
            {"name": "Chemical Equilibrium", "description": "Le Chatelier's principle, equilibrium constants, reversible reactions", "difficulty": 3, "importance": 5, "utme_weight": 3.5, "time": 35},
        ],
    },
    {
        "name": "Organic Chemistry - Hydrocarbons",
        "description": "Alkanes, alkenes, alkynes and their chemistry",
        "concepts": [
            {"name": "Alkanes", "description": "Nomenclature, isomerism, preparation, physical and chemical properties, substitution reactions", "difficulty": 2, "importance": 5, "utme_weight": 3.5, "time": 30},
            {"name": "Alkenes", "description": "Nomenclature, preparation, addition reactions, polymerization, test for unsaturation", "difficulty": 3, "importance": 5, "utme_weight": 3.5, "time": 30},
            {"name": "Alkynes", "description": "Nomenclature, preparation, properties, uses of ethyne", "difficulty": 2, "importance": 4, "utme_weight": 2.5, "time": 20},
        ],
    },
    {
        "name": "Organic Chemistry - Functional Groups",
        "description": "Alkanols, alkanoic acids, alkanoates, and other functional groups",
        "concepts": [
            {"name": "Alkanols", "description": "Classification (primary, secondary, tertiary), preparation, properties, uses of ethanol", "difficulty": 3, "importance": 5, "utme_weight": 3.5, "time": 30},
            {"name": "Alkanoic Acids", "description": "Nomenclature, carboxylic group, physical and chemical properties, uses", "difficulty": 3, "importance": 5, "utme_weight": 3.5, "time": 30},
            {"name": "Alkanoates (Esters)", "description": "Esterification, hydrolysis, properties and uses", "difficulty": 3, "importance": 4, "utme_weight": 3.0, "time": 25},
            {"name": "Fats, Oils, Soaps and Detergents", "description": "Structure of fats and oils, saponification, soap vs detergent action", "difficulty": 3, "importance": 4, "utme_weight": 3.0, "time": 30},
        ],
    },
    {
        "name": "Metals and Their Extraction",
        "description": "Properties, extraction, and compounds of metals",
        "concepts": [
            {"name": "General Properties of Metals", "description": "Physical and chemical properties, activity series, alloys", "difficulty": 2, "importance": 4, "utme_weight": 3.0, "time": 25},
            {"name": "Extraction of Metals", "description": "Extraction of iron, aluminium, sodium, calcium — processes and principles", "difficulty": 3, "importance": 5, "utme_weight": 3.5, "time": 35},
            {"name": "Compounds of Metals", "description": "Oxides, hydroxides, chlorides, trioxonitrate(V) salts — preparation and properties", "difficulty": 3, "importance": 4, "utme_weight": 2.5, "time": 30},
        ],
    },
    {
        "name": "Giant Molecules and Polymers",
        "description": "Carbohydrates, proteins, and synthetic polymers",
        "concepts": [
            {"name": "Carbohydrates", "description": "Monosaccharides, disaccharides, polysaccharides — structure, tests, uses", "difficulty": 3, "importance": 4, "utme_weight": 3.0, "time": 25},
            {"name": "Proteins and Enzymes", "description": "Amino acids, peptide bonds, denaturation, enzyme properties", "difficulty": 3, "importance": 4, "utme_weight": 3.0, "time": 30},
            {"name": "Synthetic Polymers", "description": "Addition and condensation polymerization, examples (polythene, nylon, polyester), uses", "difficulty": 3, "importance": 4, "utme_weight": 2.5, "time": 25},
        ],
    },
]

PHYSICS_TOPICS = [
    {
        "name": "Measurements and Units",
        "description": "Fundamental and derived quantities, units, and measurement techniques",
        "concepts": [
            {"name": "Physical Quantities and Units", "description": "SI units, fundamental quantities (length, mass, time), derived quantities, dimensional analysis", "difficulty": 1, "importance": 5, "utme_weight": 3.0, "time": 20},
            {"name": "Measurement Instruments", "description": "Vernier calipers, micrometer screw gauge, measuring cylinder — usage and errors", "difficulty": 2, "importance": 4, "utme_weight": 2.5, "time": 25},
            {"name": "Errors and Significant Figures", "description": "Systematic and random errors, accuracy, precision, significant figures", "difficulty": 2, "importance": 3, "utme_weight": 2.0, "time": 20},
        ],
    },
    {
        "name": "Scalars and Vectors",
        "description": "Scalar and vector quantities, resolution and resultant of forces",
        "concepts": [
            {"name": "Scalar and Vector Quantities", "description": "Definitions, examples, graphical representation of vectors", "difficulty": 1, "importance": 4, "utme_weight": 2.0, "time": 15},
            {"name": "Resolution and Resultant of Forces", "description": "Parallelogram law, triangle of forces, resolution into components", "difficulty": 3, "importance": 5, "utme_weight": 3.5, "time": 30},
        ],
    },
    {
        "name": "Motion",
        "description": "Linear motion, Newton's laws, and projectile motion",
        "concepts": [
            {"name": "Linear Motion", "description": "Speed, velocity, acceleration, equations of motion, distance-time and velocity-time graphs", "difficulty": 2, "importance": 5, "utme_weight": 4.5, "time": 40},
            {"name": "Newton's Laws of Motion", "description": "First, second, and third laws, inertia, F=ma calculations, momentum", "difficulty": 3, "importance": 5, "utme_weight": 5.0, "time": 45},
            {"name": "Projectile Motion", "description": "Horizontal and vertical components, range, maximum height, time of flight", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 40},
            {"name": "Circular Motion", "description": "Centripetal force and acceleration, angular velocity, conical pendulum", "difficulty": 3, "importance": 4, "utme_weight": 3.0, "time": 30},
        ],
    },
    {
        "name": "Energy, Work and Power",
        "description": "Forms of energy, work done, power, and energy conservation",
        "concepts": [
            {"name": "Work and Energy", "description": "Work done, kinetic energy, potential energy, work-energy theorem", "difficulty": 2, "importance": 5, "utme_weight": 4.0, "time": 30},
            {"name": "Conservation of Energy", "description": "Law of conservation of energy, energy transformations, efficiency", "difficulty": 2, "importance": 5, "utme_weight": 3.5, "time": 25},
            {"name": "Power", "description": "Power calculations, mechanical advantage, velocity ratio, efficiency of machines", "difficulty": 2, "importance": 4, "utme_weight": 3.0, "time": 25},
            {"name": "Simple Machines", "description": "Levers, pulleys, inclined planes, gears — mechanical advantage and efficiency", "difficulty": 2, "importance": 4, "utme_weight": 3.0, "time": 25},
        ],
    },
    {
        "name": "Waves",
        "description": "Properties and types of waves",
        "concepts": [
            {"name": "Wave Properties", "description": "Wavelength, frequency, amplitude, period, speed, wave equation v=fλ", "difficulty": 2, "importance": 5, "utme_weight": 4.0, "time": 30},
            {"name": "Types of Waves", "description": "Transverse and longitudinal waves, mechanical and electromagnetic waves", "difficulty": 2, "importance": 4, "utme_weight": 2.5, "time": 20},
            {"name": "Wave Phenomena", "description": "Reflection, refraction, diffraction, interference, superposition", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 35},
            {"name": "Sound Waves", "description": "Properties, speed of sound, echoes, resonance, musical instruments", "difficulty": 2, "importance": 4, "utme_weight": 3.0, "time": 25},
        ],
    },
    {
        "name": "Light and Optics",
        "description": "Reflection, refraction, lenses, and optical instruments",
        "concepts": [
            {"name": "Reflection of Light", "description": "Laws of reflection, plane mirrors, curved mirrors, mirror formula", "difficulty": 2, "importance": 5, "utme_weight": 3.5, "time": 30},
            {"name": "Refraction of Light", "description": "Snell's law, critical angle, total internal reflection, apparent depth", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 35},
            {"name": "Lenses", "description": "Converging and diverging lenses, lens formula, magnification, power of lens", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 35},
            {"name": "Optical Instruments", "description": "Microscope, telescope, camera, projector — principles and ray diagrams", "difficulty": 3, "importance": 3, "utme_weight": 2.0, "time": 25},
        ],
    },
    {
        "name": "Heat and Temperature",
        "description": "Thermal physics, heat transfer, and gas laws",
        "concepts": [
            {"name": "Temperature and Thermometers", "description": "Temperature scales, types of thermometers, calibration", "difficulty": 1, "importance": 4, "utme_weight": 2.0, "time": 15},
            {"name": "Heat Transfer", "description": "Conduction, convection, radiation — mechanisms and applications", "difficulty": 2, "importance": 4, "utme_weight": 3.0, "time": 25},
            {"name": "Thermal Expansion", "description": "Linear, area, and volume expansion, applications and consequences", "difficulty": 2, "importance": 4, "utme_weight": 2.5, "time": 20},
            {"name": "Specific Heat Capacity and Latent Heat", "description": "Calculations, method of mixtures, heating/cooling curves", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 35},
        ],
    },
    {
        "name": "Electricity",
        "description": "Current electricity, circuits, and electrical measurements",
        "concepts": [
            {"name": "Electric Current and Potential Difference", "description": "Charge, current, EMF, p.d., Ohm's law, resistance calculations", "difficulty": 2, "importance": 5, "utme_weight": 4.5, "time": 35},
            {"name": "Resistors in Series and Parallel", "description": "Combined resistance, potential dividers, Kirchhoff's laws", "difficulty": 3, "importance": 5, "utme_weight": 4.5, "time": 40},
            {"name": "Electrical Energy and Power", "description": "P=IV, E=Pt, cost of electricity, kilowatt-hour calculations", "difficulty": 2, "importance": 5, "utme_weight": 3.5, "time": 25},
            {"name": "Electric Cells", "description": "Primary and secondary cells, EMF and internal resistance, cell combinations", "difficulty": 3, "importance": 4, "utme_weight": 3.0, "time": 30},
        ],
    },
    {
        "name": "Electromagnetism",
        "description": "Magnetic effects of electric current and electromagnetic induction",
        "concepts": [
            {"name": "Magnetic Fields", "description": "Magnetic field lines, Earth's magnetic field, magnetic materials", "difficulty": 2, "importance": 4, "utme_weight": 2.5, "time": 20},
            {"name": "Electromagnetic Induction", "description": "Faraday's law, Lenz's law, generators, transformers, eddy currents", "difficulty": 4, "importance": 5, "utme_weight": 4.0, "time": 40},
            {"name": "Alternating Current", "description": "AC vs DC, RMS values, transformers, power transmission", "difficulty": 3, "importance": 4, "utme_weight": 3.0, "time": 30},
        ],
    },
    {
        "name": "Modern Physics",
        "description": "Atomic physics, radioactivity, and nuclear physics",
        "concepts": [
            {"name": "Photoelectric Effect", "description": "Einstein's equation, threshold frequency, work function, applications", "difficulty": 4, "importance": 5, "utme_weight": 3.5, "time": 35},
            {"name": "Radioactivity", "description": "Alpha, beta, gamma radiation, half-life, decay equations, carbon dating", "difficulty": 3, "importance": 5, "utme_weight": 4.0, "time": 40},
            {"name": "Nuclear Reactions", "description": "Fission, fusion, chain reactions, nuclear reactors, Einstein's E=mc²", "difficulty": 4, "importance": 4, "utme_weight": 3.0, "time": 35},
            {"name": "Wave-Particle Duality", "description": "De Broglie wavelength, electron diffraction, quantum concepts", "difficulty": 4, "importance": 3, "utme_weight": 2.0, "time": 25},
        ],
    },
]


async def seed_database():
    """Seed the database with initial data."""
    print("🌱 Starting database seed...")

    # Initialize database tables
    await init_db()
    print("✅ Database tables created.")

    async with async_session() as session:
        # Check if already seeded (based on subjects rather than users, so manual user signups don't block seeding)
        from app.models.subject import Subject
        result = await session.execute(select(func.count(Subject.id)))
        subject_count = result.scalar()
        if subject_count and subject_count > 0:
            print("⚠️  Database already seeded with subjects. Skipping...")
            return

        # ── SEED USERS ───────────────────────────────────────────────────
        users = []
        for user_data in USERS:
            # Check if user already exists
            existing = await session.execute(select(User).where(User.username == user_data["username"]))
            user = existing.scalar_one_or_none()
            if not user:
                user = User(
                    username=user_data["username"],
                    password_hash=hash_password(user_data["password"]),
                    role=user_data["role"],
                )
                session.add(user)
            users.append(user)
        await session.flush()
        print(f"✅ Created {len(users)} users: {', '.join(u.username for u in users)}")

        # ── SEED SUBJECTS ────────────────────────────────────────────────
        subjects = []
        for subj_data in SUBJECTS:
            subject = Subject(**subj_data)
            session.add(subject)
            subjects.append(subject)
        await session.flush()
        print(f"✅ Created {len(subjects)} subjects: {', '.join(s.name for s in subjects)}")

        # Map subjects by name for topic association
        subject_map = {s.name: s for s in subjects}

        # ── SEED TOPICS AND CONCEPTS ─────────────────────────────────────
        topic_data_map = {
            "Biology": BIOLOGY_TOPICS,
            "Chemistry": CHEMISTRY_TOPICS,
            "Physics": PHYSICS_TOPICS,
        }

        total_topics = 0
        total_concepts = 0

        for subject_name, topics_data in topic_data_map.items():
            subject = subject_map[subject_name]
            for order_idx, topic_data in enumerate(topics_data):
                topic = Topic(
                    subject_id=subject.id,
                    name=topic_data["name"],
                    description=topic_data["description"],
                    order_index=order_idx,
                )
                session.add(topic)
                await session.flush()
                total_topics += 1

                for concept_idx, concept_data in enumerate(topic_data.get("concepts", [])):
                    concept = Concept(
                        topic_id=topic.id,
                        name=concept_data["name"],
                        description=concept_data["description"],
                        difficulty=concept_data["difficulty"],
                        importance=concept_data["importance"],
                        utme_weight=concept_data.get("utme_weight", 1.0),
                        mastery_threshold=0.8,
                        estimated_time_minutes=concept_data.get("time", 30),
                        content=concept_data.get("content"),
                        quiz_data=concept_data.get("quiz_data"),
                        order_index=concept_idx,
                    )
                    session.add(concept)
                    total_concepts += 1

                await session.flush()

        print(f"✅ Created {total_topics} topics and {total_concepts} concepts")

        # ── PARSE ACTUAL MATERIALS ───────────────────────────────────────
        import os, re
        print("📖 Parsing biology materials from markdown...")
        materials_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'materials', 'markdown')
        if os.path.exists(materials_dir):
            biology_files = [f for f in os.listdir(materials_dir) if 'BIOLOGY' in f.upper() and f.endswith('.md')]
            biology_subject = subject_map.get("Biology")
            if biology_subject:
                for file in biology_files:
                    filepath = os.path.join(materials_dir, file)
                    with open(filepath, 'r') as f:
                        content = f.read()
                    
                    parts = re.split(r'TOPIC:\s*', content)
                    if len(parts) > 1:
                        topic_name = file.replace('.md', '').strip()[:100]
                        topic = Topic(name=topic_name, description=f"Notes from {topic_name}", subject_id=biology_subject.id, order_index=total_topics)
                        session.add(topic)
                        await session.flush()
                        total_topics += 1
                        
                        for part in parts[1:]:
                            lines = part.split('\n')
                            topic_title_raw = lines[0]
                            topic_title = topic_title_raw.replace('|', '').strip()
                            topic_title = re.sub(r'\s{2,}', ' ', topic_title)
                            if not topic_title:
                                topic_title = "Untitled Concept"
                            
                            # Clean content
                            clines = []
                            for line in lines[1:]:
                                if line.strip().startswith('|') or line.strip().endswith('|'):
                                    line = line.replace('|', '')
                                    line = re.sub(r'\s{2,}', ' ', line)
                                clines.append(line.strip())
                            concept_content = '\n'.join(clines).strip()
                            
                            if concept_content:
                                concept = Concept(
                                    topic_id=topic.id,
                                    name=topic_title[:100],
                                    description=f"Study material for {topic_title[:50]}",
                                    content=concept_content[:50000],
                                    difficulty=2,
                                    importance=3,
                                    estimated_time_minutes=30,
                                    order_index=0
                                )
                                session.add(concept)
                await session.flush()
                print("✅ Added parsed materials to database")

        # ── SEED STUDENT PROFILES ────────────────────────────────────────
        profiles_created = 0
        for user in users:
            for subject in subjects:
                # Count concepts for this subject
                concept_count_result = await session.execute(
                    select(func.count(Concept.id))
                    .join(Topic, Concept.topic_id == Topic.id)
                    .where(Topic.subject_id == subject.id)
                )
                concept_count = concept_count_result.scalar() or 0

                profile = StudentProfile(
                    user_id=user.id,
                    subject_id=subject.id,
                    mastery_score=0.0,
                    total_study_time_minutes=0,
                    concepts_mastered=0,
                    total_concepts=concept_count,
                    current_streak=0,
                )
                session.add(profile)
                profiles_created += 1

        await session.commit()
        print(f"✅ Created {profiles_created} student profiles")

    print("🎉 Database seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_database())
