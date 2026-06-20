echo "Creating ALL topics"
docker exec development-kafka-1-1 bash -c "
  kafka-topics --create --if-not-exists --topic notification.onboarding.email.confirmation.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic notification.onboarding.phone.confirmation.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic order.payment.initiated.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic notification.onboarding.user.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic notification.authentication.2fa.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic notification.authentication.reset.password.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic notification.tenant.onboarding.confirmation.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic user.onboarding.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic tenant.onboarding.failed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic tenant.onboarding.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic authentication.user.rollback.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic notification.store.onboarding.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic product.onboarding.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic order.checkout.started.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic order.payment.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic order.payment.failed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic order.payment.refunded.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic order.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic order.reservation.failed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic inventory.reservation.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic inventory.stock.committed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic cart.item.outOfStock.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic product.updated.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  kafka-topics --create --if-not-exists --topic product.deleted.completed.topic --partitions 6 --replication-factor 3 --config min.insync.replicas=2 --bootstrap-server kafka-1:9092,kafka-2:9093,kafka-3:9094 &&
  echo 'All topics created successfully!'
"