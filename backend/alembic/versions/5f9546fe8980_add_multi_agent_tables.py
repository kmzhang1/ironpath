"""add multi-agent tables

Revision ID: 5f9546fe8980
Revises:
Create Date: 2026-01-21 12:23:37.360472

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5f9546fe8980'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create new tables and extend existing ones for multi-agent system."""

    # Create training_methodologies table
    op.create_table(
        'training_methodologies',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('system_prompt_template', sa.String(), nullable=False),
        sa.Column('programming_rules', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('knowledge_base', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Create exercises table
    op.create_table(
        'exercises',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('variation_type', sa.String(), nullable=False),
        sa.Column('equipment', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('targets_weak_points', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('movement_pattern', sa.String(), nullable=False),
        sa.Column('complexity', sa.String(), nullable=False),
        sa.Column('coaching_cues', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('idx_exercises_name', 'exercises', ['name'])
    op.create_index('idx_exercises_category', 'exercises', ['category'])

    # Create readiness_checks table
    op.create_table(
        'readiness_checks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('program_id', sa.String(), nullable=False),
        sa.Column('week_number', sa.Integer(), nullable=False),
        sa.Column('day_number', sa.Integer(), nullable=False),
        sa.Column('sleep_quality', sa.Integer(), nullable=False),
        sa.Column('stress_level', sa.Integer(), nullable=False),
        sa.Column('soreness_fatigue', sa.Integer(), nullable=False),
        sa.Column('overall_readiness', sa.Float(), nullable=False),
        sa.Column('adjustment_recommendation', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['profiles.id']),
        sa.ForeignKeyConstraint(['program_id'], ['programs.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Create agent_conversations table
    op.create_table(
        'agent_conversations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('agent_type', sa.String(), nullable=False),
        sa.Column('user_message', sa.String(), nullable=False),
        sa.Column('intent_classification', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('agent_response', sa.String(), nullable=False),
        sa.Column('context', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['profiles.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Extend lifter_profiles with multi-agent fields
    op.add_column('lifter_profiles', sa.Column(
        'training_age', sa.String(), nullable=False, server_default='novice'
    ))
    op.add_column('lifter_profiles', sa.Column(
        'weak_points', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'
    ))
    op.add_column('lifter_profiles', sa.Column(
        'equipment_access', sa.String(), nullable=False, server_default='commercial'
    ))
    op.add_column('lifter_profiles', sa.Column(
        'preferred_session_length', sa.Integer(), nullable=False, server_default='60'
    ))
    op.add_column('lifter_profiles', sa.Column(
        'competition_date', sa.DateTime(), nullable=True
    ))
    op.add_column('lifter_profiles', sa.Column(
        'methodology_id', sa.String(), nullable=True
    ))
    op.create_foreign_key(
        'fk_lifter_profiles_methodology',
        'lifter_profiles', 'training_methodologies',
        ['methodology_id'], ['id']
    )
    op.create_index(
        'idx_lifter_profiles_methodology_id',
        'lifter_profiles',
        ['methodology_id']
    )

    # Extend programs with methodology tracking
    op.add_column('programs', sa.Column(
        'methodology_id', sa.String(), nullable=True
    ))
    op.add_column('programs', sa.Column(
        'generation_metadata', postgresql.JSON(astext_type=sa.Text()),
        nullable=False, server_default='{}'
    ))
    op.create_foreign_key(
        'fk_programs_methodology',
        'programs', 'training_methodologies',
        ['methodology_id'], ['id']
    )
    op.create_index(
        'idx_programs_methodology_id',
        'programs',
        ['methodology_id']
    )


def downgrade() -> None:
    """Revert multi-agent changes."""

    # Drop indexes on programs
    op.drop_index('idx_programs_methodology_id', 'programs')
    op.drop_constraint('fk_programs_methodology', 'programs', type_='foreignkey')
    op.drop_column('programs', 'generation_metadata')
    op.drop_column('programs', 'methodology_id')

    # Drop indexes and columns on lifter_profiles
    op.drop_index('idx_lifter_profiles_methodology_id', 'lifter_profiles')
    op.drop_constraint('fk_lifter_profiles_methodology', 'lifter_profiles', type_='foreignkey')
    op.drop_column('lifter_profiles', 'methodology_id')
    op.drop_column('lifter_profiles', 'competition_date')
    op.drop_column('lifter_profiles', 'preferred_session_length')
    op.drop_column('lifter_profiles', 'equipment_access')
    op.drop_column('lifter_profiles', 'weak_points')
    op.drop_column('lifter_profiles', 'training_age')

    # Drop new tables
    op.drop_table('agent_conversations')
    op.drop_table('readiness_checks')
    op.drop_index('idx_exercises_category', 'exercises')
    op.drop_index('idx_exercises_name', 'exercises')
    op.drop_table('exercises')
    op.drop_table('training_methodologies')
