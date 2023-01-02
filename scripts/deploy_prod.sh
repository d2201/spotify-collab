source $PWD/scripts/env_source.sh

echo "Upgrading prod deployment in project $PROJECT_ID"

helm upgrade --install -f ./config/prod.yaml --set image=europe-west3-docker.pkg.dev/$PROJECT_ID/spotify-collab/app:$(git rev-parse master) charts ./charts