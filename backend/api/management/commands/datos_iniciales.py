from django.core.management.base import BaseCommand
from api.models import Categoria, Interes, Habilidad, User, Proyecto
import random
from django.utils.text import slugify
from api.utils.embedding import (
    obtener_embedding,
    construir_texto_embedding_usuario,
    construir_texto_embedding_proyecto
)

class Command(BaseCommand):
    help = "Define datos iniciales para categorías, habilidades, usuarios y proyectos."

    def handle(self, *args, **kwargs):
        
        categories = [
            "Desarrollo Web", "Aplicaciones Moviles", "Data Science", "Machine Learning",
            "Desarrollo de Videojuegos", "Internet de las Cosas", "Ciberseguridad", "Blockchain", "Aplicaciones de IA", "DevOps"
        ]
        for nombre in categories:
            Categoria.objects.get_or_create(nombre=nombre)

        
        interests = [
            "Cambio Climático", "Salud", "Educación", "Finanzas", "Arte y Diseño",
            "Impacto Social", "Videojuegos", "Deportes", "Exploración Espacial", "Accesibilidad",
            "Agricultura", "Salud Mental", "Ciudades Inteligentes", "Robótica", "AR/VR",
            "Open Source", "Computación Cuántica", "Música", "Energías Limpias", "Automatización"
        ]
        for nombre in interests:
            Interes.objects.get_or_create(nombre=nombre)

        
        abilities = [
            "Python", "JavaScript", "HTML/CSS", "React", "Node.js", "Django", "Flask",
            "TensorFlow", "PyTorch", "SQL", "NoSQL", "AWS", "Docker", "Kubernetes",
            "Figma", "UI/UX", "Java", "C++", "Rust", "Go", "Swift", "Kotlin",
            "Data Analysis", "Machine Learning", "Deep Learning", "Ciberseguridad",
            "Blockchain", "Modelado 3D", "Diseño de Juegos", "Arduino", "Raspberry Pi",
            "CI/CD", "Agile", "Scrum", "Linux", "GraphQL", "REST APIs", "TypeScript",
            "DevOps", "Procesamiento de Lenguaje Natural"
        ]
        for nombre in abilities:
            Habilidad.objects.get_or_create(nombre=nombre)

        
        for i in range(1, 50):
            username = f"asesor{i}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "tipo_usuario": User.ASESOR,
                    "estado": "disponible",
                    "bio": f"Soy asesor {i} con experiencia dirigiendo proyectos tecnológicos.",
                }
            )
            if created:
                user.set_password("password123")
                user.save()
            interests_sample = random.sample(list(Interes.objects.all()), k=3)
            abilities_sample = random.sample(list(Habilidad.objects.all()), k=5)
            user.intereses.set(interests_sample)
            user.habilidades.set(abilities_sample)
            user.refresh_from_db()
            texto = construir_texto_embedding_usuario(user)
            embedding = obtener_embedding(texto)
            user.embedding = embedding
            user.save(update_fields=["embedding"])

        
        for i in range(2, 100):
            username = f"estudiante{i}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "tipo_usuario": User.ESTUDIANTE,
                    "estado": "disponible",
                    "bio": f"Soy estudiante {i} con ganas de unirme a proyectos y crecer mis habilidades.",
                }
            )
            if created:
                user.set_password("password123")
                user.save()
            interests_sample = random.sample(list(Interes.objects.all()), k=3)
            abilities_sample = random.sample(list(Habilidad.objects.all()), k=5)
            user.intereses.set(interests_sample)
            user.habilidades.set(abilities_sample)
            user.refresh_from_db()
            texto = construir_texto_embedding_usuario(user)
            embedding = obtener_embedding(texto)
            user.embedding = embedding
            user.save(update_fields=["embedding"])
        
        
        project_names = [
            "Jardín Inteligente", "EcoFinance App", "Tutor Inmersivo VR", "AI Health Assistant",
            "Sistema de Alerta de Desastres", "Food Waste Tracker", "Libre CMS", "GenerArte",
            "Autonomous Drone", "Educación Remota", "FT Fitness Tracker", "Notifica",
            "Mental Health Chatbot", "VotApp", "Smart Traffic", "MuseAR",
            "Casa Segura", "Compra Sustentable", "Assistive Tech for Blind", "Reduce tu Huella",
            "MIDA Monitor Inteligente de Agua", "Moving", "IntercambiApp", "GRI Gestor de Residuos Inteligente",
            "Mi Mercadito"
        ]

        creators = list(User.objects.filter(tipo_usuario__in=[User.ESTUDIANTE, User.ASESOR]))
        random.shuffle(creators)
        for nombre, creador in zip(project_names, creators):
            proyecto = Proyecto.objects.create(
                nombre=nombre,
                descripcion=f"{nombre} es un proyecto inovador que resuelve problemas complejos usando tecnología.",
                creador=creador,
                estado="buscando_estudiantes"
            )
            
            if creador.es_estudiante():
                proyecto.estudiantes.add(creador)
            else:
                proyecto.asesor = creador

            
            selected_categories = random.sample(list(Categoria.objects.all()), k=random.randint(1, 3))
            selected_abilities = random.sample(list(Habilidad.objects.all()), k=random.randint(3, 6))
            proyecto.categorias.set(selected_categories)
            proyecto.habilidades_requeridas.set(selected_abilities)
            proyecto.save()
            texto = construir_texto_embedding_proyecto(proyecto)
            embedding = obtener_embedding(texto)
            proyecto.embedding = embedding
            proyecto.save(update_fields=["embedding"])

        self.stdout.write(self.style.SUCCESS("🚀 proyectos creados."))

        self.stdout.write(self.style.SUCCESS("✅ Categorías, Intereses, Estudiantes y Mentores creados"))
