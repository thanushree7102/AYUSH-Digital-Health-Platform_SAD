FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PORT=5000
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Train the model while building the image -> model.joblib is baked into the image
RUN python train.py
RUN useradd -m app && chown -R app /app
USER app
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "import urllib.request,os;urllib.request.urlopen('http://localhost:'+os.environ['PORT']+'/health')"
CMD ["sh", "-c", "gunicorn -b 0.0.0.0:$PORT -w 2 app:app"]
