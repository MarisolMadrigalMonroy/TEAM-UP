from rest_framework import serializers
from .models import Ability, Interest, Category, Comment, Project, User,  ProjectMatchInterest, UserMatchInterest, ProjectMatch, Notification

class InterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interest
        fields = ['id', 'name']

class AbilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Ability
        fields = ['id', 'name']

class UserSerializer(serializers.ModelSerializer):
    interests = serializers.PrimaryKeyRelatedField(many=True, queryset=Interest.objects.all())
    abilities = serializers.PrimaryKeyRelatedField(many=True, queryset=Ability.objects.all())

    class Meta:
        model = User
        fields = '__all__'
        extra_kwargs = {'password': {'write_only': True}} # No queremos regresar la contraseña del usuario
    
    def create(self, validated_data):
        interests = validated_data.pop('interests', [])
        abilities = validated_data.pop('abilities', [])

        user = User.objects.create_user(**validated_data)

        user.interests.set(interests)
        user.abilities.set(abilities)
        return user


class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')

    class Meta:
        model = Comment
        fields = ['id', 'project', 'author', 'author_username', 'content', 'created_at', 'updated_at']
        read_only_fields = ['author', 'created_at', 'updated_at']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

class ProjectSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        write_only=True,
    )
    
    required_abilities = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Ability.objects.all(),
        write_only=True,
    )
    students = UserSerializer(many=True, read_only=True)
    mentor = UserSerializer(read_only=True)
    categories_details = CategorySerializer(many=True, read_only=True, source='categories')
    required_abilities_details = AbilitySerializer(many=True, read_only=True, source='required_abilities')
    has_liked = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'created_at', 'name', 'description', 'mentor', 'creator', 'students', 'categories', 
            'required_abilities', 'categories_details', 'required_abilities_details', 'status', 'has_liked']
        read_only_fields = ['embedding']
    
    def validate_students(self, users):
        if len(users) > 3:
            raise serializers.ValidationError('A project cannot have more than 4 students.')

        # Revisamos que cada usuario no haya sido asignado a otro proyecto
        for user in users:
            if user.projects.exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError(f'Student {user.username} is already assigned to another project.')
        return users
    
    def update(self, instance, validated_data):
        categories = validated_data.pop('categories', None)
        abilities = validated_data.pop('required_abilities', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories is not None:
            instance.categories.set(categories)
        if abilities is not None:
            instance.required_abilities.set(abilities)

        return instance

    def get_has_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return ProjectMatchInterest.objects.filter(
            user=user,
            project=obj,
            liked=True
        ).exists()


class UserProfileSerializer(serializers.ModelSerializer):
    interests = serializers.PrimaryKeyRelatedField(many=True, queryset=Interest.objects.all())
    abilities = serializers.PrimaryKeyRelatedField(many=True, queryset=Ability.objects.all())
    projects = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True,
        source='projects_as_student'
    )

    class Meta:
        model = User
        fields = ['id', 'interests', 'abilities', 'status', 'user_type', 'projects', 'bio']
    
    def update(self, instance, validated_data):
        interests = validated_data.pop('interests', None)
        abilities = validated_data.pop('abilities', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if interests is not None:
            instance.interests.set(interests)
        if abilities is not None:
            instance.abilities.set(abilities)

        instance.save()
        return instance


class ProjectMatchInterestSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    liked = serializers.BooleanField()

    class Meta:
        model = ProjectMatchInterest
        fields = ['id', 'user', 'project', 'liked', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class UserMatchInterestSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    liked = serializers.BooleanField()

    class Meta:
        model = UserMatchInterest
        fields = ['id', 'user', 'project', 'liked', 'created_at']
        read_only_fields = ['id', 'created_at']

class ProjectMatchSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    project = serializers.PrimaryKeyRelatedField(read_only=True)
    matched_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ProjectMatch
        fields = ['id', 'user', 'project', 'matched_at']

class NotificationSerializer(serializers.ModelSerializer):
    related_project_name = serializers.CharField(source='related_project.name', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at', 'related_project', 'related_project_name']
        read_only_fields = ['id', 'created_at', 'related_project_name']

class UserDetailSerializer(serializers.ModelSerializer):
    abilities = AbilitySerializer(many=True)
    interests = InterestSerializer(many=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'bio', 'abilities', 'interests']

