FROM public.ecr.aws/lambda/nodejs:16
COPY app.js .
CMD ["app.handler"]