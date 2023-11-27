export DOCKER_IMAGE_VERSION="dev_$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 8 | head -n 1)"


docker login -u "djmarret1992" -p "Tumadre1@" docker.io

docker build -t djmarret1992/soap_consulta:${DOCKER_IMAGE_VERSION} -f Dockerfile .
docker tag djmarret1992/soap_consulta:${DOCKER_IMAGE_VERSION} djmarret1992/soap_consulta:latest
docker push djmarret1992/soap_consulta:${DOCKER_IMAGE_VERSION}
docker push djmarret1992/soap_consulta:latest
echo "tag: ${DOCKER_IMAGE_VERSION}"