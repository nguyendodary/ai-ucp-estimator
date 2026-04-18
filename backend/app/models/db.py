import os

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    func,
    inspect,
    text,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from app.core.config import settings

Base = declarative_base()


def _ensure_sqlite_dir(database_url: str) -> None:
    # Handles the common default: sqlite:///./data/ucp_estimation.db
    if not database_url.startswith("sqlite:///"):
        return
    db_path = database_url.replace("sqlite:///", "", 1)
    parent = os.path.dirname(db_path)
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)


engine = create_engine(
    settings.database_url,
    echo=settings.db_echo,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True,
)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    actors = relationship("Actor", back_populates="project", cascade="all, delete-orphan")
    use_cases = relationship("UseCase", back_populates="project", cascade="all, delete-orphan")
    analysis_result = relationship(
        "AnalysisResult",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Actor(Base):
    __tablename__ = "actors"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(255), nullable=False)
    type = Column(String(16), nullable=False)  # simple|average|complex
    weight = Column(Integer, nullable=False)

    project = relationship("Project", back_populates="actors")


class UseCase(Base):
    __tablename__ = "use_cases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False, default="")
    complexity = Column(String(16), nullable=False)  # simple|average|complex
    weight = Column(Integer, nullable=False)

    project = relationship("Project", back_populates="use_cases")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    uaw = Column(Float, nullable=False)
    uucw = Column(Float, nullable=False)
    uucp = Column(Float, nullable=False)
    tcf = Column(Float, nullable=False)
    ecf = Column(Float, nullable=False)
    ucp = Column(Float, nullable=False)
    effort_hours = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="analysis_result")


def init_db() -> None:
    _ensure_sqlite_dir(settings.database_url)
    Base.metadata.create_all(bind=engine)
    _ensure_analysis_results_uucp_column()


def _ensure_analysis_results_uucp_column() -> None:
    """
    Lightweight schema migration for legacy databases created before `uucp` existed.
    """
    inspector = inspect(engine)
    if "analysis_results" not in inspector.get_table_names():
        return

    columns = {c["name"] for c in inspector.get_columns("analysis_results")}
    if "uucp" in columns:
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE analysis_results "
                "ADD COLUMN uucp FLOAT NOT NULL DEFAULT 0"
            )
        )
        conn.execute(
            text(
                "UPDATE analysis_results "
                "SET uucp = COALESCE(uaw, 0) + COALESCE(uucw, 0) "
                "WHERE uucp = 0"
            )
        )

