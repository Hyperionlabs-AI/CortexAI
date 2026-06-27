from setuptools import setup, find_packages

setup(
    name="aiobs-sdk",
    version="0.1.0",
    description="AIOBS instrumentation SDK for Python LLM applications",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=["httpx>=0.26.0"],
)
